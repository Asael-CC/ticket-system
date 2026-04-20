import { Router } from 'express';
import { assignmentService } from '../services/assignment';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * POST /api/assignment/:ticketId/auto
 * Asigna automáticamente un ticket - AGENT, SUPERVISOR, ADMIN only
 */
router.post('/:ticketId/auto', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { strategy } = req.query;

    const ticket = await assignmentService.autoAssign(
      ticketId,
      strategy as string | undefined
    );

    if (!ticket) {
      res.status(400).json({ error: 'No se pudo asignar el ticket' });
      return;
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({ error: 'Error al asignar el ticket' });
  }
});

/**
 * GET /api/assignment/:ticketId/suggest
 * Sugiere el mejor agente para un ticket - AGENT, SUPERVISOR, ADMIN only
 */
router.get('/:ticketId/suggest', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { strategy } = req.query;

    const agent = await assignmentService.suggestAgent(
      ticketId,
      strategy as string | undefined
    );

    if (!agent) {
      res.status(404).json({ error: 'No hay agentes disponibles' });
      return;
    }

    res.json({ agent });
  } catch (error) {
    console.error('Suggest agent error:', error);
    res.status(500).json({ error: 'Error al sugerir agente' });
  }
});

/**
 * GET /api/assignment/queue/:queueId/workload
 * Obtiene estadísticas de carga de trabajo de una cola - AGENT, SUPERVISOR, ADMIN only
 */
router.get('/queue/:queueId/workload', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req, res) => {
  try {
    const { queueId } = req.params;

    const workload = await assignmentService.getQueueWorkload(queueId);

    res.json({ workload });
  } catch (error) {
    console.error('Workload error:', error);
    res.status(500).json({ error: 'Error al obtener carga de trabajo' });
  }
});

export { router as assignmentRouter };
