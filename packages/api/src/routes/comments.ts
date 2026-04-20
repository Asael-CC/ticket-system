import { Router } from 'express';
import { PrismaClient } from '@ticket-system/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { slaService } from '../services/sla';

const router = Router();
const prisma = new PrismaClient();

// Get comments for a ticket
router.get('/ticket/:ticketId', authenticate, async (req: AuthRequest, res) => {
  const { ticketId } = req.params;

  try {
    const comments = await prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create comment
// CUSTOMER: can only comment on their own tickets, cannot create internal comments
router.post(
  '/',
  authenticate,
  [
    body('ticketId').trim().notEmpty().withMessage('Ticket ID is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('isInternal').optional().isIn(['true', 'false', true, false]).withMessage('isInternal must be a boolean'),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { ticketId, content, isInternal: isInternalRaw = true, mentionedUserIds = [] } = req.body;
    let isInternal = isInternalRaw === true || isInternalRaw === 'true';

    try {
      // Verify ticket exists
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      // CUSTOMER restrictions
      if (req.user!.role === 'CUSTOMER') {
        // Can only comment on their own tickets
        if (ticket.requesterId !== req.user!.id) {
          res.status(403).json({ error: 'Not authorized to comment on this ticket' });
          return;
        }
        // Cannot create internal comments
        isInternal = false;
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          isInternal,
          ticketId,
          authorId: req.user!.id,
          mentionedUserIds,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update ticket firstResponseAt if this is the first public comment
      if (!isInternal && !ticket.firstResponseAt) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() },
        });
      }

      // Log activity
      await prisma.activity.create({
        data: {
          action: 'COMMENT_ADDED',
          description: `Comment ${isInternal ? '(internal)' : '(public)'} added`,
          ticketId,
          userId: req.user!.id,
          metadata: { commentId: comment.id },
        },
      });

      // Update SLA tracking
      await slaService.updateTicketSLA(ticketId, 'COMMENT_ADDED');

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

// Delete comment (author or admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Only author or admin can delete
    if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized to delete this comment' });
      return;
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export { router as commentsRouter };
