import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const initializeWebSocket = (io: Server): void => {
  // Middleware para autenticación de WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        role: string;
      };
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Unirse a salas específicas
    socket.join(`user:${socket.userId}`);

    if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPERVISOR') {
      socket.join('admin-room');
    }

    // Escuchar eventos
    socket.on('subscribe:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`User ${socket.userId} subscribed to ticket ${ticketId}`);
    });

    socket.on('unsubscribe:ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('subscribe:queue', (queueId: string) => {
      socket.join(`queue:${queueId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

// Helpers para emitir eventos
export const emitTicketUpdate = (io: Server, ticketId: string, data: any): void => {
  io.to(`ticket:${ticketId}`).to('admin-room').emit('ticket:updated', {
    ticketId,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitNewComment = (io: Server, ticketId: string, comment: any): void => {
  io.to(`ticket:${ticketId}`).emit('comment:new', {
    ticketId,
    comment,
    timestamp: new Date().toISOString(),
  });
};

export const emitSLAAlert = (io: Server, ticketId: string, type: 'WARNING' | 'BREACHED', minutesRemaining?: number): void => {
  io.to(`ticket:${ticketId}`).to('admin-room').emit('sla:alert', {
    ticketId,
    type,
    minutesRemaining,
    timestamp: new Date().toISOString(),
  });
};
