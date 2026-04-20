import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { authRouter } from './routes/auth';
import { ticketsRouter } from './routes/tickets';
import { queuesRouter } from './routes/queues';
import { usersRouter } from './routes/users';
import { commentsRouter } from './routes/comments';
import { dashboardRouter } from './routes/dashboard';
import { assignmentRouter } from './routes/assignment';
import { slaRouter } from './routes/sla';
import { errorHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './websocket/handler';
import { cronService } from './services/cron';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket
initializeWebSocket(io);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Ticket System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      tickets: '/api/tickets',
      queues: '/api/queues',
      users: '/api/users',
      comments: '/api/comments',
      dashboard: '/api/dashboard',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/queues', queuesRouter);
app.use('/api/users', usersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/assignment', assignmentRouter);
app.use('/api/sla', slaRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Iniciar tareas programadas
  cronService.start();
});

export { io };
