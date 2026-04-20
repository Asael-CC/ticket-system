import { getSlackClient, isSlackConfigured } from './client';
import { PrismaClient } from '@ticket-system/database';

const prisma = new PrismaClient();

interface TicketData {
  id: string;
  number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  requester: { name: string; email: string };
  assignedTo?: { name: string } | null;
  queue: { name: string; color: string };
  slackChannelId?: string | null;
  slackThreadTs?: string | null;
}

export async function notifyTicketCreated(ticket: TicketData, channelId?: string): Promise<void> {
  if (!isSlackConfigured()) return;

  const client = getSlackClient();
  if (!client) return;

  const targetChannel = channelId || process.env.SLACK_DEFAULT_CHANNEL;
  if (!targetChannel) {
    console.warn('No se especificó canal de Slack para notificación');
    return;
  }

  try {
    const result = await client.chat.postMessage({
      channel: targetChannel,
      text: `🎫 Nuevo ticket: ${ticket.number}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎫 Nuevo Ticket: ${ticket.number}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Solicitante:*\n${ticket.requester.name}` },
            { type: 'mrkdwn', text: `*Prioridad:*\n${formatPriority(ticket.priority)}` },
            { type: 'mrkdwn', text: `*Cola:*\n${ticket.queue.name}` },
            { type: 'mrkdwn', text: `*Estado:*\n${formatStatus(ticket.status)}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${ticket.subject}*\n${truncateText(ticket.description, 500)}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Ver Ticket', emoji: true },
              url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.id}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Tomar Ticket', emoji: true },
              action_id: 'take_ticket',
              value: ticket.id,
            },
          ],
        },
      ],
    });

    if (result.ts) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          slackChannelId: targetChannel,
          slackThreadTs: result.ts,
        },
      });
    }

    console.log(`📨 Notificación enviada: ${ticket.number}`);
  } catch (error) {
    console.error('Error enviando notificación a Slack:', error);
  }
}

export async function notifyTicketAssigned(ticket: TicketData, previousAgent?: string | null): Promise<void> {
  if (!isSlackConfigured() || !ticket.slackThreadTs || !ticket.slackChannelId) return;

  const client = getSlackClient();
  if (!client) return;

  try {
    const message = previousAgent
      ? `🔄 Reasignado a *${ticket.assignedTo?.name || 'Sin asignar'}*`
      : `👤 Asignado a *${ticket.assignedTo?.name}*`;

    await client.chat.postMessage({
      channel: ticket.slackChannelId,
      thread_ts: ticket.slackThreadTs,
      text: message,
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    OPEN: '🔵 Abierto',
    IN_PROGRESS: '🟡 En Progreso',
    PENDING: '🟠 Pendiente',
    RESOLVED: '🟢 Resuelto',
    CLOSED: '⚫ Cerrado',
  };
  return map[status] || status;
}

function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    LOW: '🔵 Baja',
    MEDIUM: '🟢 Media',
    HIGH: '🟠 Alta',
    URGENT: '🔴 Urgente',
  };
  return map[priority] || priority;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
