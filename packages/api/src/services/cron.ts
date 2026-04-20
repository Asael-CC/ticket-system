import cron from 'node-cron';
import { slaService } from './sla';
import { assignmentService } from './assignment';

/**
 * Servicio de tareas programadas
 */
export class CronService {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Inicia todas las tareas programadas
   */
  start(): void {
    console.log('⏰ Iniciando tareas programadas...');

    // Verificar SLA cada 5 minutos
    const slaCheckTask = cron.schedule('*/5 * * * *', async () => {
      console.log('[CRON] Verificando SLAs...');
      try {
        const result = await slaService.checkAllActiveTickets();
        console.log(`[CRON] SLA Check: ${result.total} tickets, ${result.breached} breached, ${result.warning} warning`);

        // Obtener tickets cerca de violar SLA
        const nearBreach = await slaService.getTicketsNearSLABreach(30);
        if (nearBreach.length > 0) {
          console.log(`[CRON] Alerta: ${nearBreach.length} tickets cerca de violar SLA`);
          // Aquí se podrían enviar notificaciones a Slack/email
        }
      } catch (error) {
        console.error('[CRON] Error verificando SLAs:', error);
      }
    });

    this.tasks.push(slaCheckTask);

    // Verificar carga de trabajo y balancear cada 15 minutos
    const workloadCheckTask = cron.schedule('*/15 * * * *', async () => {
      console.log('[CRON] Verificando carga de trabajo...');
      try {
        const queues = await this.getActiveQueues();
        for (const queue of queues) {
          const workload = await assignmentService.getQueueWorkload(queue.id);
          if (workload.overloadedAgents > 0) {
            console.log(`[CRON] Cola ${queue.name}: ${workload.overloadedAgents} agentes sobrecargados`);
          }
        }
      } catch (error) {
        console.error('[CRON] Error verificando carga:', error);
      }
    });

    this.tasks.push(workloadCheckTask);

    console.log('✅ Tareas programadas iniciadas');
  }

  /**
   * Detiene todas las tareas
   */
  stop(): void {
    console.log('⏹️ Deteniendo tareas programadas...');
    this.tasks.forEach((task) => task.stop());
    this.tasks = [];
  }

  private async getActiveQueues() {
    const { PrismaClient } = await import('@ticket-system/database');
    const prisma = new PrismaClient();
    try {
      const queues = await prisma.queue.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      return queues;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Exportar instancia singleton
export const cronService = new CronService();
