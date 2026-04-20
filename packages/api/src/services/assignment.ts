import { PrismaClient, Ticket, User } from '@ticket-system/database';

const prisma = new PrismaClient();

export interface AssignmentStrategy {
  name: string;
  assignAgent(ticketId: string, queueId: string): Promise<User | null>;
}

/**
 * Estrategia: Round Robin - Asigna al siguiente agente en la cola
 */
export class RoundRobinStrategy implements AssignmentStrategy {
  name = 'round-robin';

  async assignAgent(ticketId: string, queueId: string): Promise<User | null> {
    // Obtener el último ticket asignado en esta cola para encontrar el último agente
    const lastAssignedTicket = await prisma.ticket.findFirst({
      where: {
        queueId,
        assignedToId: { not: null },
      },
      orderBy: { assignedToId: 'desc' },
      select: { assignedToId: true },
    });

    // Obtener todos los agentes activos de esta cola
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        agents: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!queue || queue.agents.length === 0) {
      return null;
    }

    const agentIds = queue.agents.map((a) => a.id);

    // Encontrar el índice del último agente asignado
    const lastIndex = lastAssignedTicket?.assignedToId
      ? agentIds.indexOf(lastAssignedTicket.assignedToId)
      : -1;

    // Seleccionar el siguiente agente (round-robin)
    const nextIndex = (lastIndex + 1) % agentIds.length;
    const selectedAgentId = agentIds[nextIndex];

    // Obtener el agente completo
    const agent = await prisma.user.findUnique({
      where: { id: selectedAgentId },
    });

    return agent;
  }
}

/**
 * Estrategia: Least Assigned - Asigna al agente con menos tickets activos
 */
export class LeastAssignedStrategy implements AssignmentStrategy {
  name = 'least-assigned';

  async assignAgent(ticketId: string, queueId: string): Promise<User | null> {
    // Obtener agentes activos de la cola con conteo de tickets
    const agentsWithTicketCount = await prisma.user.findMany({
      where: {
        isActive: true,
        queues: { some: { id: queueId } },
      },
      include: {
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
          },
        },
      },
    });

    if (agentsWithTicketCount.length === 0) {
      return null;
    }

    // Ordenar por cantidad de tickets (menor a mayor)
    const sortedAgents = agentsWithTicketCount.sort(
      (a, b) => a.assignedTickets.length - b.assignedTickets.length
    );

    // Devolver el agente con menos tickets
    return sortedAgents[0];
  }
}

/**
 * Servicio principal de asignación
 */
export class AssignmentService {
  private strategies: Map<string, AssignmentStrategy> = new Map();
  private defaultStrategy: AssignmentStrategy;

  constructor() {
    // Registrar estrategias disponibles
    const roundRobin = new RoundRobinStrategy();
    const leastAssigned = new LeastAssignedStrategy();

    this.strategies.set(roundRobin.name, roundRobin);
    this.strategies.set(leastAssigned.name, leastAssigned);

    // Estrategia por defecto
    this.defaultStrategy = leastAssigned;
  }

  /**
   * Asigna automáticamente un ticket a un agente
   */
  async autoAssign(ticketId: string, strategyName?: string): Promise<Ticket | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { queue: true },
    });

    if (!ticket || !ticket.queue) {
      return null;
    }

    // Si el ticket ya tiene asignado un agente, no hacer nada
    if (ticket.assignedToId) {
      return ticket;
    }

    // Seleccionar estrategia
    const strategy = strategyName
      ? this.strategies.get(strategyName) || this.defaultStrategy
      : this.defaultStrategy;

    // Encontrar agente
    const agent = await strategy.assignAgent(ticketId, ticket.queueId);

    if (!agent) {
      return null;
    }

    // Asignar ticket al agente
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: agent.id,
        status: 'IN_PROGRESS',
      },
      include: {
        assignedTo: true,
        queue: true,
        requester: true,
      },
    });

    // Crear actividad
    await prisma.activity.create({
      data: {
        action: 'ASSIGNED',
        description: `Ticket auto-asignado a ${agent.name} usando estrategia ${strategy.name}`,
        ticketId: ticket.id,
        userId: agent.id,
        metadata: {
          strategy: strategy.name,
          previousAgent: null,
          newAgent: agent.id,
        },
      },
    });

    return updatedTicket;
  }

  /**
   * Sugiere el mejor agente para un ticket sin asignarlo
   */
  async suggestAgent(ticketId: string, strategyName?: string): Promise<User | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { queue: true },
    });

    if (!ticket || !ticket.queue) {
      return null;
    }

    const strategy = strategyName
      ? this.strategies.get(strategyName) || this.defaultStrategy
      : this.defaultStrategy;

    return strategy.assignAgent(ticketId, ticket.queueId);
  }

  /**
   * Obtiene estadísticas de carga de trabajo por cola
   */
  async getQueueWorkload(queueId: string): Promise<{
    agents: Array<{
      id: string;
      name: string;
      activeTickets: number;
      avgResolutionTime: number;
    }>;
    totalUnassigned: number;
    overloadedAgents: number;
  }> {
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        queues: { some: { id: queueId } },
      },
      include: {
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
          },
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: 'RESOLVED',
                resolvedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
                },
              },
            },
          },
        },
      },
    });

    const agentStats = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      activeTickets: agent.assignedTickets.length,
      avgResolutionTime: this.calculateAvgResolutionTime(agent.assignedTickets),
    }));

    const unassignedCount = await prisma.ticket.count({
      where: {
        queueId,
        assignedToId: null,
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    const overloadedThreshold = 10; // Más de 10 tickets considerado sobrecargado
    const overloadedAgents = agentStats.filter((a) => a.activeTickets > overloadedThreshold).length;

    return {
      agents: agentStats,
      totalUnassigned: unassignedCount,
      overloadedAgents,
    };
  }

  private calculateAvgResolutionTime(tickets: Ticket[]): number {
    const resolvedWithTime = tickets.filter(
      (t) => t.status === 'RESOLVED' && t.resolvedAt && t.createdAt
    );

    if (resolvedWithTime.length === 0) return 0;

    const totalTime = resolvedWithTime.reduce((acc, t) => {
      return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
    }, 0);

    return Math.round(totalTime / resolvedWithTime.length / (1000 * 60)); // En minutos
  }
}

// Exportar instancia singleton
export const assignmentService = new AssignmentService();
