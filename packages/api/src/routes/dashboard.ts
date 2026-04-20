import { Router } from 'express';
import { PrismaClient } from '@ticket-system/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get dashboard metrics - AGENT, SUPERVISOR, ADMIN only
router.get('/metrics', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      pendingTickets,
      resolvedToday,
      slaBreached,
      myTickets,
      unassignedTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.ticket.count({ where: { slaBreached: true } }),
      req.user!.role === 'AGENT'
        ? prisma.ticket.count({
            where: {
              assignedToId: req.user!.id,
              status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
            },
          })
        : Promise.resolve(0),
      prisma.ticket.count({ where: { assignedToId: null, status: 'OPEN' } }),
    ]);

    res.json({
      metrics: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        pending: pendingTickets,
        resolvedToday,
        slaBreached,
        myTickets,
        unassigned: unassignedTickets,
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get tickets by status (for charts) - AGENT, SUPERVISOR, ADMIN only
router.get('/tickets-by-status', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const result = ticketsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching tickets by status:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get tickets by queue - AGENT, SUPERVISOR, ADMIN only
router.get('/tickets-by-queue', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const ticketsByQueue = await prisma.ticket.groupBy({
      by: ['queueId'],
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
      },
      _count: {
        queueId: true,
      },
    });

    // Get queue names
    const queueIds = ticketsByQueue.map((t) => t.queueId);
    const queues = await prisma.queue.findMany({
      where: { id: { in: queueIds } },
      select: { id: true, name: true },
    });

    const result = ticketsByQueue.map((item) => ({
      queueId: item.queueId,
      queueName: queues.find((q) => q.id === item.queueId)?.name || 'Unknown',
      count: item._count.queueId,
    }));

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching tickets by queue:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get recent activity - AGENT, SUPERVISOR, ADMIN only
router.get('/recent-activity', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const activities = await prisma.activity.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true },
        },
        ticket: {
          select: { id: true, number: true, subject: true },
        },
      },
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get SLA metrics - AGENT, SUPERVISOR, ADMIN only
router.get('/sla-metrics', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const total = await prisma.ticket.count();
    const breached = await prisma.ticket.count({ where: { slaBreached: true } });
    const warning = await prisma.ticket.count({
      where: {
        slaBreached: false,
        slaDeadline: {
          lte: new Date(Date.now() + 60 * 60 * 1000), // Within 1 hour
          gte: new Date(),
        },
      },
    });
    const compliant = total - breached - warning;

    res.json({
      data: {
        compliant,
        warning,
        breached,
        total,
        complianceRate: total > 0 ? ((compliant / total) * 100).toFixed(1) : 100,
      },
    });
  } catch (error) {
    console.error('Error fetching SLA metrics:', error);
    res.status(500).json({ error: 'Failed to fetch SLA metrics' });
  }
});

export { router as dashboardRouter };
