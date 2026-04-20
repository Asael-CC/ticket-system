import { Router } from 'express';
import { PrismaClient } from '@ticket-system/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Get all queues - All authenticated users can view (needed for CUSTOMER to create tickets)
router.get('/', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN', 'CUSTOMER'), async (req: AuthRequest, res) => {
  try {
    const queues = await prisma.queue.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            agents: true,
            tickets: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
              },
            },
          },
        },
        slaConfig: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      queues: queues.map((queue) => ({
        ...queue,
        agentCount: queue._count.agents,
        ticketCount: queue._count.tickets,
      })),
    });
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// Get queue by ID with tickets - AGENT, SUPERVISOR, ADMIN can view
router.get('/:id', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const queue = await prisma.queue.findUnique({
      where: { id },
      include: {
        agents: {
          select: { id: true, name: true, email: true },
        },
        tickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            requester: {
              select: { id: true, name: true, email: true },
            },
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        slaConfig: true,
      },
    });

    if (!queue) {
      res.status(404).json({ error: 'Queue not found' });
      return;
    }

    res.json({ queue });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Create queue (Admin/Supervisor only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'SUPERVISOR'),
  [
    body('name').trim().notEmpty().withMessage('Queue name is required'),
    body('description').optional().trim(),
    body('color').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, color, agentIds } = req.body;

    try {
      const queue = await prisma.queue.create({
        data: {
          name,
          description,
          color: color || '#3B82F6',
          agents: agentIds ? { connect: agentIds.map((id: string) => ({ id })) } : undefined,
        },
        include: {
          agents: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({ queue });
    } catch (error) {
      console.error('Error creating queue:', error);
      res.status(500).json({ error: 'Failed to create queue' });
    }
  }
);

// Update queue
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'SUPERVISOR'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('color').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { name, description, color, isActive, agentIds } = req.body;

    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (color) updateData.color = color;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Handle agents update
      if (agentIds) {
        updateData.agents = {
          set: agentIds.map((id: string) => ({ id })),
        };
      }

      const queue = await prisma.queue.update({
        where: { id },
        data: updateData,
        include: {
          agents: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({ queue });
    } catch (error) {
      console.error('Error updating queue:', error);
      res.status(500).json({ error: 'Failed to update queue' });
    }
  }
);

// Get tickets in queue (for work queue view) - AGENT, SUPERVISOR, ADMIN can view
router.get('/:id/tickets', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status = 'OPEN', page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = { queueId: id };
    if (status !== 'all') {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching queue tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

export { router as queuesRouter };
