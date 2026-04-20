import { Router } from 'express';
import { PrismaClient } from '@ticket-system/database';
import { query, body, validationResult } from 'express-validator';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { generateTicketNumber } from '@ticket-system/shared';
import { slaService } from '../services/sla';

const router = Router();
const prisma = new PrismaClient();

// Get all tickets with filters
// CUSTOMER: only sees their own tickets
// AGENT: sees tickets from their queues
// SUPERVISOR/ADMIN: sees all tickets
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('queueId').optional().isUUID(),
    query('assignedToId').optional().isUUID(),
    query('priority').optional().isString(),
    query('search').optional().isString(),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { status, queueId, assignedToId, priority, search } = req.query;

    const where: any = {};

    // Role-based filtering
    if (req.user!.role === 'CUSTOMER') {
      // Customers can only see their own tickets
      where.requesterId = req.user!.id;
    } else if (req.user!.role === 'AGENT') {
      // Agents can see tickets from their queues
      const userQueues = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { queues: { select: { id: true } } },
      });
      const queueIds = userQueues?.queues.map((q) => q.id) || [];
      where.OR = [
        { queueId: { in: queueIds } },
        { assignedToId: req.user!.id },
        { requesterId: req.user!.id },
      ];
    }
    // SUPERVISOR and ADMIN can see all tickets

    if (status) where.status = status;
    if (queueId) where.queueId = queueId;
    if (assignedToId) {
      where.assignedToId = assignedToId === 'unassigned' ? null : assignedToId;
    }
    if (priority) where.priority = priority;

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { number: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    try {
      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            requester: {
              select: { id: true, name: true, email: true },
            },
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
            queue: {
              select: { id: true, name: true, color: true },
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }
);

// Get ticket by ID
// CUSTOMER: can only view their own tickets
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        queue: {
          select: { id: true, name: true, color: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Check permissions based on role
    if (req.user!.role === 'CUSTOMER') {
      if (ticket.requester.id !== req.user!.id) {
        res.status(403).json({ error: 'Not authorized to view this ticket' });
        return;
      }
      // Filter out internal comments for customers
      ticket.comments = ticket.comments.filter((c: any) => !c.isInternal);
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create ticket
router.post(
  '/',
  authenticate,
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('queueId').isUUID().withMessage('Valid queue ID is required'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { subject, description, queueId, priority, category, tags } = req.body;

    try {
      // Generate ticket number
      const ticketNumber = generateTicketNumber();

      const ticket = await prisma.ticket.create({
        data: {
          number: ticketNumber,
          subject,
          description,
          priority: priority || 'MEDIUM',
          category,
          tags: tags || [],
          requesterId: req.user!.id,
          queueId,
        },
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          queue: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      // Create activity log
      await prisma.activity.create({
        data: {
          action: 'CREATED',
          ticketId: ticket.id,
          userId: req.user!.id,
        },
      });

      // Initialize SLA
      await slaService.updateTicketSLA(ticket.id, 'TICKET_CREATED');

      res.status(201).json({ ticket });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  }
);

// Update ticket
// CUSTOMER: cannot update tickets
// AGENT: can update status only if assigned to ticket
// SUPERVISOR/ADMIN: full access
router.patch(
  '/:id',
  authenticate,
  [
    body('subject').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    // CUSTOMER cannot update tickets
    if (req.user!.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot update tickets' });
      return;
    }

    try {
      const existingTicket = await prisma.ticket.findUnique({
        where: { id },
      });

      if (!existingTicket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      // AGENT can only update status if assigned to the ticket
      if (req.user!.role === 'AGENT') {
        const canUpdate =
          existingTicket.assignedToId === req.user!.id ||
          existingTicket.requesterId === req.user!.id;

        if (!canUpdate) {
          res.status(403).json({ error: 'Not authorized to update this ticket' });
          return;
        }

        // AGENT can only update status, not other fields
        const allowedFields = ['status'];
        const attemptedFields = Object.keys(updates);
        const hasUnauthorizedFields = attemptedFields.some((f) => !allowedFields.includes(f));

        if (hasUnauthorizedFields) {
          res.status(403).json({ error: 'Agents can only update ticket status' });
          return;
        }
      }

      const updateData: any = {};

      if (updates.subject) updateData.subject = updates.subject;
      if (updates.description) updateData.description = updates.description;
      if (updates.status) {
        updateData.status = updates.status;
        if (updates.status === 'RESOLVED') {
          updateData.resolvedAt = new Date();
        } else if (updates.status === 'CLOSED') {
          updateData.closedAt = new Date();
        }
      }
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.queueId) updateData.queueId = updates.queueId;
      if (updates.assignedToId !== undefined) {
        updateData.assignedToId = updates.assignedToId || null;
      }
      if (updates.category) updateData.category = updates.category;
      if (updates.tags) updateData.tags = updates.tags;

      const ticket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          queue: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          action: 'UPDATED',
          description: `Updated fields: ${Object.keys(updates).join(', ')}`,
          ticketId: ticket.id,
          userId: req.user!.id,
        },
      });

      // Update SLA tracking
      await slaService.updateTicketSLA(ticket.id, 'STATUS_CHANGED');

      res.json({ ticket });
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  }
);

// Take ticket (assign to current user)
// CUSTOMER cannot take tickets
router.post('/:id/take', authenticate, requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: req.user!.id,
        status: 'IN_PROGRESS',
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        queue: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'ASSIGNED',
        description: `Ticket taken by ${req.user!.id}`,
        ticketId: ticket.id,
        userId: req.user!.id,
      },
    });

    res.json({ ticket });
  } catch (error) {
    console.error('Error taking ticket:', error);
    res.status(500).json({ error: 'Failed to take ticket' });
  }
});

export { router as ticketsRouter };
