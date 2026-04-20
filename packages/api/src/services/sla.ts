import { PrismaClient, Ticket, SLAConfig } from '@ticket-system/database';

const prisma = new PrismaClient();

export interface SLATimes {
  firstResponseDeadline: Date | null;
  resolutionDeadline: Date | null;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export interface SLAStatus {
  ticketId: string;
  firstResponse: {
    deadline: Date | null;
    achieved: boolean;
    minutesRemaining: number | null;
  };
  resolution: {
    deadline: Date | null;
    achieved: boolean;
    minutesRemaining: number | null;
  };
  breached: boolean;
  warningLevel: 'none' | 'warning' | 'critical';
}

/**
 * Servicio de cálculo de SLA considerando horario laboral
 */
export class SLAService {
  /**
   * Calcula los tiempos límite de SLA para un ticket
   */
  async calculateSLATimes(ticketId: string): Promise<SLATimes | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        queue: {
          include: {
            slaConfig: true,
          },
        },
      },
    });

    if (!ticket || !ticket.queue?.slaConfig) {
      return null;
    }

    const config = ticket.queue.slaConfig;
    const createdAt = new Date(ticket.createdAt);

    const firstResponseDeadline = config.businessHoursOnly
      ? this.addBusinessMinutes(createdAt, config.firstResponseTimeMinutes, config)
      : this.addMinutes(createdAt, config.firstResponseTimeMinutes);

    const resolutionDeadline = config.businessHoursOnly
      ? this.addBusinessMinutes(createdAt, config.resolutionTimeMinutes, config)
      : this.addMinutes(createdAt, config.resolutionTimeMinutes);

    return {
      firstResponseDeadline,
      resolutionDeadline,
      firstResponseMinutes: config.firstResponseTimeMinutes,
      resolutionMinutes: config.resolutionTimeMinutes,
    };
  }

  /**
   * Calcula el estado actual del SLA de un ticket
   */
  async getSLAStatus(ticketId: string): Promise<SLAStatus | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        queue: {
          include: {
            slaConfig: true,
          },
        },
      },
    });

    if (!ticket || !ticket.queue?.slaConfig) {
      return null;
    }

    const now = new Date();
    const times = await this.calculateSLATimes(ticketId);

    if (!times) return null;

    // Calcular estado de primera respuesta
    const firstResponseAchieved = ticket.firstResponseAt != null;
    const firstResponseMinutesRemaining = times.firstResponseDeadline
      ? Math.floor((times.firstResponseDeadline.getTime() - now.getTime()) / (1000 * 60))
      : null;

    // Calcular estado de resolución
    const resolutionAchieved = ['RESOLVED', 'CLOSED'].includes(ticket.status);
    const resolutionMinutesRemaining = times.resolutionDeadline
      ? Math.floor((times.resolutionDeadline.getTime() - now.getTime()) / (1000 * 60))
      : null;

    // Determinar si el SLA está violado
    const firstResponseBreached = !firstResponseAchieved &&
      times.firstResponseDeadline && now > times.firstResponseDeadline;
    const resolutionBreached = !resolutionAchieved &&
      times.resolutionDeadline && now > times.resolutionDeadline;
    const breached = firstResponseBreached || resolutionBreached;

    // Determinar nivel de alerta
    let warningLevel: 'none' | 'warning' | 'critical' = 'none';
    if (breached) {
      warningLevel = 'critical';
    } else if (
      (firstResponseMinutesRemaining && firstResponseMinutesRemaining < 60) ||
      (resolutionMinutesRemaining && resolutionMinutesRemaining < 120)
    ) {
      warningLevel = 'warning';
    }

    return {
      ticketId: ticket.id,
      firstResponse: {
        deadline: times.firstResponseDeadline,
        achieved: firstResponseAchieved,
        minutesRemaining: firstResponseMinutesRemaining,
      },
      resolution: {
        deadline: times.resolutionDeadline,
        achieved: resolutionAchieved,
        minutesRemaining: resolutionMinutesRemaining,
      },
      breached,
      warningLevel,
    };
  }

  /**
   * Actualiza los campos SLA de un ticket basado en eventos
   */
  async updateTicketSLA(ticketId: string, event: 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'TICKET_CREATED'): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        queue: { include: { slaConfig: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket || !ticket.queue?.slaConfig) return;

    const slaTimes = await this.calculateSLATimes(ticketId);
    if (!slaTimes) return;

    // Si es el primer comentario, marcar firstResponseAt
    if (event === 'COMMENT_ADDED' && !ticket.firstResponseAt && ticket.comments.length > 0) {
      const firstComment = ticket.comments[0];
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          firstResponseAt: firstComment.createdAt,
        },
      });
    }

    // Si el ticket se resuelve, marcar resolvedAt
    if (event === 'STATUS_CHANGED' && ticket.status === 'RESOLVED') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          resolvedAt: new Date(),
        },
      });
    }

    // Verificar si el SLA está violado y actualizar el flag
    const slaStatus = await this.getSLAStatus(ticketId);
    if (slaStatus?.breached && !ticket.slaBreached) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { slaBreached: true },
      });

      // Crear actividad de violación
      await prisma.activity.create({
        data: {
          action: 'SLA_BREACHED',
          description: 'SLA violado para este ticket',
          ticketId,
          userId: ticket.assignedToId || ticket.requesterId,
          metadata: {
            firstResponseBreached: slaStatus.firstResponse.minutesRemaining !== null && slaStatus.firstResponse.minutesRemaining < 0,
            resolutionBreached: slaStatus.resolution.minutesRemaining !== null && slaStatus.resolution.minutesRemaining < 0,
          },
        },
      });
    }

    // Actualizar deadline
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        slaDeadline: slaTimes.resolutionDeadline,
      },
    });
  }

  /**
   * Verifica todos los tickets activos y actualiza sus estados SLA
   */
  async checkAllActiveTickets(): Promise<{
    total: number;
    breached: number;
    warning: number;
  }> {
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
        slaBreached: false,
      },
      include: {
        queue: { include: { slaConfig: true } },
      },
    });

    let breached = 0;
    let warning = 0;

    for (const ticket of activeTickets) {
      if (!ticket.queue?.slaConfig) continue;

      const slaStatus = await this.getSLAStatus(ticket.id);
      if (!slaStatus) continue;

      if (slaStatus.breached) {
        await this.updateTicketSLA(ticket.id, 'STATUS_CHANGED');
        breached++;
      } else if (slaStatus.warningLevel === 'warning') {
        warning++;
      }
    }

    return {
      total: activeTickets.length,
      breached,
      warning,
    };
  }

  /**
   * Obtiene tickets que están por vencer (para alertas)
   */
  async getTicketsNearSLABreach(minutesThreshold: number = 60): Promise<Array<{
    ticket: Ticket;
    minutesRemaining: number;
    type: 'firstResponse' | 'resolution';
  }>> {
    const now = new Date();
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
        slaBreached: false,
      },
      include: {
        queue: { include: { slaConfig: true } },
        assignedTo: true,
      },
    });

    const nearBreach: Array<{
      ticket: Ticket;
      minutesRemaining: number;
      type: 'firstResponse' | 'resolution';
    }> = [];

    for (const ticket of activeTickets) {
      const slaStatus = await this.getSLAStatus(ticket.id);
      if (!slaStatus) continue;

      // Verificar primera respuesta
      if (
        !slaStatus.firstResponse.achieved &&
        slaStatus.firstResponse.minutesRemaining !== null &&
        slaStatus.firstResponse.minutesRemaining > 0 &&
        slaStatus.firstResponse.minutesRemaining <= minutesThreshold
      ) {
        nearBreach.push({
          ticket,
          minutesRemaining: slaStatus.firstResponse.minutesRemaining,
          type: 'firstResponse',
        });
      }

      // Verificar resolución
      if (
        slaStatus.resolution.minutesRemaining !== null &&
        slaStatus.resolution.minutesRemaining > 0 &&
        slaStatus.resolution.minutesRemaining <= minutesThreshold
      ) {
        nearBreach.push({
          ticket,
          minutesRemaining: slaStatus.resolution.minutesRemaining,
          type: 'resolution',
        });
      }
    }

    // Ordenar por tiempo restante (menor primero)
    return nearBreach.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
  }

  /**
   * Obtiene métricas de SLA para el dashboard
   */
  async getSLAMetrics(timeRange: 'today' | 'week' | 'month' = 'today'): Promise<{
    totalTickets: number;
    firstResponseAchieved: number;
    firstResponseRate: number;
    resolutionAchieved: number;
    resolutionRate: number;
    avgFirstResponseMinutes: number;
    avgResolutionMinutes: number;
    breachedCount: number;
    breachRate: number;
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: startDate },
        queue: { slaConfig: { isNot: null } },
      },
      include: {
        queue: { include: { slaConfig: true } },
      },
    });

    if (tickets.length === 0) {
      return {
        totalTickets: 0,
        firstResponseAchieved: 0,
        firstResponseRate: 0,
        resolutionAchieved: 0,
        resolutionRate: 0,
        avgFirstResponseMinutes: 0,
        avgResolutionMinutes: 0,
        breachedCount: 0,
        breachRate: 0,
      };
    }

    const withFirstResponse = tickets.filter((t) => t.firstResponseAt);
    const resolved = tickets.filter((t) => t.resolvedAt);
    const breached = tickets.filter((t) => t.slaBreached);

    const avgFirstResponseTime = withFirstResponse.reduce((acc, t) => {
      return acc + (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
    }, 0) / (withFirstResponse.length || 1);

    const avgResolutionTime = resolved.reduce((acc, t) => {
      return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
    }, 0) / (resolved.length || 1);

    return {
      totalTickets: tickets.length,
      firstResponseAchieved: withFirstResponse.length,
      firstResponseRate: Math.round((withFirstResponse.length / tickets.length) * 100),
      resolutionAchieved: resolved.length,
      resolutionRate: Math.round((resolved.length / tickets.length) * 100),
      avgFirstResponseMinutes: Math.round(avgFirstResponseTime),
      avgResolutionMinutes: Math.round(avgResolutionTime),
      breachedCount: breached.length,
      breachRate: Math.round((breached.length / tickets.length) * 100),
    };
  }

  // Helpers privados

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addBusinessMinutes(
    startDate: Date,
    minutes: number,
    config: SLAConfig
  ): Date {
    const { workStartHour, workEndHour, workDays } = config;

    let currentDate = new Date(startDate);
    let remainingMinutes = minutes;

    while (remainingMinutes > 0) {
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.

      // Verificar si es día laborable
      if (!workDays.includes(dayOfWeek)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      const hour = currentDate.getHours();

      // Si es antes del horario laboral, mover al inicio
      if (hour < workStartHour) {
        currentDate.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      // Si es después del horario laboral, mover al siguiente día
      if (hour >= workEndHour) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      // Calcular minutos disponibles hoy
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(workEndHour, 0, 0, 0);
      const availableMinutes = Math.floor(
        (endOfDay.getTime() - currentDate.getTime()) / (1000 * 60)
      );

      if (remainingMinutes <= availableMinutes) {
        currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableMinutes;
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(workStartHour, 0, 0, 0);
      }
    }

    return currentDate;
  }
}

// Exportar instancia singleton
export const slaService = new SLAService();
