import { Ticket, Comment } from '@ticket-system/database';

export function formatTicketBlocks(ticket: Ticket & {
  requester?: { name: string; email: string };
  assignedTo?: { name: string } | null;
  queue?: { name: string; color: string };
  comments?: (Comment & { author: { name: string } })[];
}, detailed: boolean = false): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🎫 ${ticket.number}: ${truncateText(ticket.subject, 100)}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Estado:*\n${formatStatus(ticket.status)}` },
        { type: 'mrkdwn', text: `*Prioridad:*\n${formatPriority(ticket.priority)}` },
        { type: 'mrkdwn', text: `*Solicitante:*\n${ticket.requester?.name || 'N/A'}` },
        { type: 'mrkdwn', text: `*Asignado:*\n${ticket.assignedTo?.name || 'Sin asignar'}` },
      ],
    },
  ];

  if (ticket.queue) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Cola: *${ticket.queue.name}*`,
        },
      ],
    });
  }

  if (detailed) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Descripción:*\n${ticket.description || '_Sin descripción_'}`},
      }
    );

    if (ticket.comments && ticket.comments.length > 0) {
      blocks.push(
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Últimos comentarios:*`,
          },
        }
      );

      ticket.comments.forEach((comment) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${comment.author.name}* - ${formatDate(comment.createdAt)}\n${truncateText(comment.content, 200)}${comment.isInternal ? ' \`(interno)\`' : ''}`,
          },
        });
      });
    }

    blocks.push(
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver en Web', emoji: true },
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.id}`,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Tomar', emoji: true },
            action_id: `take_ticket:${ticket.id}`,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolver', emoji: true },
            action_id: `resolve_ticket:${ticket.id}`,
          },
        ],
      }
    );
  } else {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Ver Detalle', emoji: true },
          action_id: `view_ticket:${ticket.id}`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Tomar', emoji: true },
          action_id: `take_ticket:${ticket.id}`,
          style: 'primary',
        },
      ],
    });
  }

  return blocks;
}

export function formatTicketList(tickets: (Ticket & {
  queue?: { name: string };
  assignedTo?: { name: string } | null
})[]): string {
  if (tickets.length === 0) {
    return '📭 No tienes tickets activos.';
  }

  const lines = tickets.map((t) => {
    const status = formatStatus(t.status);
    const priority = formatPriority(t.priority);
    const assignee = t.assignedTo ? ` - 👤 ${t.assignedTo.name}` : '';
    return `• *${t.number}* - ${truncateText(t.subject, 40)}\n  ${status} | ${priority} | ${t.queue?.name}${assignee}`;
  });

  return `📋 *Tus tickets activos:*\n\n${lines.join('\n\n')}`;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    'OPEN': '🔵 Abierto',
    'IN_PROGRESS': '🟡 En Progreso',
    'PENDING': '🟠 Pendiente',
    'RESOLVED': '🟢 Resuelto',
    'CLOSED': '⚫ Cerrado',
  };
  return map[status] || status;
}

export function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    'LOW': '🔵 Baja',
    'MEDIUM': '🟢 Media',
    'HIGH': '🟠 Alta',
    'URGENT': '🔴 Urgente',
  };
  return map[priority] || priority;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatError(message: string): string {
  return `❌ *Error:* ${message}`;
}

export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
