// Tipos compartidos entre frontend y backend

export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  SUPERVISOR = 'SUPERVISOR',
  CUSTOMER = 'CUSTOMER',  // Solo crea tickets y comenta
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export interface Queue {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  agentCount?: number;
  ticketCount?: number;
}

export interface Ticket {
  id: string;
  number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  requester: User;
  queue: Queue;
  assignedTo?: User;
  category?: string;
  tags: string[];
  slaDeadline?: Date;
  slaBreached: boolean;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  author: User;
  mentionedUserIds: string[];
  createdAt: Date;
}

export interface Activity {
  id: string;
  action: string;
  description?: string;
  user: User;
  createdAt: Date;
}

export interface SLAConfig {
  id: string;
  queueId: string;
  firstResponseTimeMinutes: number;
  resolutionTimeMinutes: number;
  businessHoursOnly: boolean;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
}

// DTOs para API
export interface CreateTicketDto {
  subject: string;
  description: string;
  priority: Priority;
  queueId: string;
  category?: string;
  tags?: string[];
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: Priority;
  queueId?: string;
  assignedToId?: string | null;
  category?: string;
  tags?: string[];
}

export interface CreateCommentDto {
  content: string;
  isInternal: boolean;
  ticketId: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// WebSocket events
export interface TicketUpdateEvent {
  ticketId: string;
  changes: Partial<Ticket>;
  updatedBy: string;
  timestamp: Date;
}

export interface NewCommentEvent {
  ticketId: string;
  comment: Comment;
}

export interface SLAAlertEvent {
  ticketId: string;
  type: 'WARNING' | 'BREACHED';
  minutesRemaining?: number;
}
