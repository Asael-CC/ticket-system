import { Router } from 'express';
import { slaService } from '../services/sla';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/sla/ticket/:ticketId
 * Obtiene el estado SLA de un ticket
 */
router.get('/ticket/:ticketId', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const slaStatus = await slaService.getSLAStatus(ticketId);

    if (!slaStatus) {
      res.status(404).json({ error: 'Ticket no encontrado o sin SLA configurado' });
      return;
    }

    res.json({ sla: slaStatus });
  } catch (error) {
    console.error('SLA status error:', error);
    res.status(500).json({ error: 'Error al obtener estado SLA' });
  }
});

/**
 * GET /api/sla/near-breach
 * Obtiene tickets cerca de violar SLA
 */
router.get('/near-breach', authenticate, async (req, res) => {
  try {
    const { minutes } = req.query;
    const threshold = minutes ? parseInt(minutes as string) : 60;

    const tickets = await slaService.getTicketsNearSLABreach(threshold);

    res.json({ tickets });
  } catch (error) {
    console.error('Near breach error:', error);
    res.status(500).json({ error: 'Error al obtener tickets cercanos a violación' });
  }
});

/**
 * GET /api/sla/metrics
 * Obtiene métricas de SLA para el dashboard
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { range } = req.query;
    const timeRange = (range as 'today' | 'week' | 'month') || 'today';

    const metrics = await slaService.getSLAMetrics(timeRange);

    res.json({ metrics });
  } catch (error) {
    console.error('SLA metrics error:', error);
    res.status(500).json({ error: 'Error al obtener métricas SLA' });
  }
});

/**
 * POST /api/sla/check-all
 * Fuerza una verificación de todos los tickets (solo para admins)
 */
router.post('/check-all', authenticate, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERVISOR') {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const result = await slaService.checkAllActiveTickets();

    res.json({
      message: 'Verificación completada',
      result,
    });
  } catch (error) {
    console.error('SLA check error:', error);
    res.status(500).json({ error: 'Error al verificar SLAs' });
  }
});

export { router as slaRouter };
