import { Router } from 'express';
import { PrismaClient } from '@ticket-system/database';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all users (Admin/Supervisor only)
router.get('/', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      users: users.map((user) => ({
        ...user,
        activeTickets: user._count.assignedTickets,
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get agents (for assignment dropdown)
router.get('/agents', authenticate, async (req: AuthRequest, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['AGENT', 'SUPERVISOR'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      agents: agents.map((agent) => ({
        ...agent,
        activeTickets: agent._count.assignedTickets,
      })),
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        queues: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    const { email, name, password, role } = req.body;

    // Validación básica
    if (!email || !name || !password || !role) {
      res.status(400).json({ error: 'Email, name, password and role are required' });
      return;
    }

    // Validar que el rol sea válido
    const validRoles = ['ADMIN', 'SUPERVISOR', 'AGENT', 'CUSTOMER'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be ADMIN, SUPERVISOR, AGENT, or CUSTOMER' });
      return;
    }

    try {
      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear el usuario
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({ user });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Update user (Admin only)
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { name, role, isActive, queueIds } = req.body;

    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (queueIds) {
        updateData.queues = {
          set: queueIds.map((id: string) => ({ id })),
        };
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          queues: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({ user });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

export { router as usersRouter };
