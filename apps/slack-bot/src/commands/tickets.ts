import { App } from '@slack/bolt';
import { PrismaClient, TicketStatus } from '@ticket-system/database';
import { generateTicketNumber } from '@ticket-system/shared';
import { formatTicketBlocks, formatTicketList, formatError, formatSuccess } from '../lib/format.js';
import { apiClient } from '../lib/api.js';

export function registerTicketCommands(app: App, prisma: PrismaClient) {
  // Comando principal /ticket
  app.command('/ticket', async ({ command, ack, respond, client, body }) => {
    await ack();

    const [subcommand, ...args] = command.text.trim().split(' ');
    const userEmail = command.user_name + '@slack.com'; // Fallback para identificar usuario

    try {
      switch (subcommand) {
        case 'create':
        case 'new':
          await handleCreateTicket(args.join(' '), command.user_id, userEmail, prisma, client, body.channel_id);
          break;
        case 'list':
        case 'ls':
          await handleListTickets(command.user_id, userEmail, prisma, respond);
          break;
        case 'view':
        case 'show':
          await handleViewTicket(args[0], prisma, respond);
          break;
        case 'assign':
          await handleAssignTicket(args[0], args[1], prisma, respond);
          break;
        case 'status':
          await handleStatusTicket(args[0], args[1], command.user_id, prisma, respond);
          break;
        case 'help':
        default:
          await respond({
            text: formatHelp(),
            response_type: 'ephemeral',
          });
      }
    } catch (error) {
      console.error('Error en comando /ticket:', error);
      await respond({
        text: formatError('Error procesando el comando. Intenta nuevamente.'),
        response_type: 'ephemeral',
      });
    }
  });
}

async function handleCreateTicket(
  subject: string,
  slackUserId: string,
  email: string,
  prisma: PrismaClient,
  client: any,
  channelId: string
) {
  if (!subject) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: formatError('Debes proporcionar un asunto. Ejemplo: `/ticket create Problema con VPN`'),
    });
    return;
  }

  // Buscar o crear usuario vinculado
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Crear usuario temporal para slack
    user = await prisma.user.create({
      data: {
        email,
        name: `Slack User (${slackUserId})`,
        password: 'NOT_SET', // No se puede loguear directamente
        role: 'AGENT',
      },
    });
  }

  // Obtener cola por defecto
  const defaultQueue = await prisma.queue.findFirst({
    where: { isActive: true },
  });

  if (!defaultQueue) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: formatError('No hay colas disponibles. Contacta al administrador.'),
    });
    return;
  }

  // Crear ticket
  const ticketNumber = generateTicketNumber();
  const ticket = await prisma.ticket.create({
    data: {
      number: ticketNumber,
      subject,
      description: `Creado desde Slack por <@${slackUserId}>\n\n${subject}`,
      requesterId: user.id,
      queueId: defaultQueue.id,
    },
    include: {
      requester: true,
      queue: true,
    },
  });

  // Crear actividad
  await prisma.activity.create({
    data: {
      action: 'CREATED',
      ticketId: ticket.id,
      userId: user.id,
    },
  });

  // Notificar en el canal
  await client.chat.postMessage({
    channel: channelId,
    text: `✅ Ticket creado: ${ticket.number}`,
    blocks: formatTicketBlocks(ticket),
  });
}

async function handleListTickets(
  slackUserId: string,
  email: string,
  prisma: PrismaClient,
  respond: any
) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await respond({
      text: formatError('No tienes tickets. Crea uno con `/ticket create [asunto]`'),
      response_type: 'ephemeral',
    });
    return;
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { requesterId: user.id },
        { assignedToId: user.id },
      ],
      status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
    },
    include: {
      queue: true,
      assignedTo: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (tickets.length === 0) {
    await respond({
      text: '📭 No tienes tickets activos.',
      response_type: 'ephemeral',
    });
    return;
  }

  await respond({
    text: formatTicketList(tickets),
    response_type: 'ephemeral',
  });
}

async function handleViewTicket(
  ticketNumber: string,
  prisma: PrismaClient,
  respond: any
) {
  if (!ticketNumber) {
    await respond({
      text: formatError('Proporciona un número de ticket. Ejemplo: `/ticket view TICK-2026-000001`'),
      response_type: 'ephemeral',
    });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { number: ticketNumber.toUpperCase() },
    include: {
      requester: true,
      assignedTo: true,
      queue: true,
      comments: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      },
    },
  });

  if (!ticket) {
    await respond({
      text: formatError(`Ticket ${ticketNumber} no encontrado.`),
      response_type: 'ephemeral',
    });
    return;
  }

  await respond({
    text: `Ticket ${ticket.number}`,
    blocks: formatTicketBlocks(ticket, true),
    response_type: 'ephemeral',
  });
}

async function handleAssignTicket(
  ticketNumber: string,
  assignee: string | undefined,
  prisma: PrismaClient,
  respond: any
) {
  if (!ticketNumber) {
    await respond({
      text: formatError('Proporciona un número de ticket.'),
      response_type: 'ephemeral',
    });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { number: ticketNumber.toUpperCase() },
  });

  if (!ticket) {
    await respond({
      text: formatError(`Ticket ${ticketNumber} no encontrado.`),
      response_type: 'ephemeral',
    });
    return;
  }

  // Si no hay assignee, desasignar
  let assigneeId: string | null = null;
  if (assignee) {
    // Buscar usuario por nombre o slack ID
    const mention = assignee.replace(/[<@>]/g, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: mention, mode: 'insensitive' } },
          { email: { contains: mention, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      await respond({
        text: formatError(`Usuario ${assignee} no encontrado.`),
        response_type: 'ephemeral',
      });
      return;
    }
    assigneeId = user.id;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { assignedToId: assigneeId },
  });

  await prisma.activity.create({
    data: {
      action: 'ASSIGNED',
      ticketId: ticket.id,
      userId: assigneeId || ticket.requesterId,
    },
  });

  await respond({
    text: formatSuccess(`Ticket ${ticketNumber} ${assigneeId ? 'asignado' : 'desasignado'}.`),
    response_type: 'ephemeral',
  });
}

async function handleStatusTicket(
  ticketNumber: string,
  status: string | undefined,
  slackUserId: string,
  prisma: PrismaClient,
  respond: any
) {
  if (!ticketNumber || !status) {
    await respond({
      text: formatError('Uso: `/ticket status [número] [estado]`\nEstados: open, in_progress, pending, resolved, closed'),
      response_type: 'ephemeral',
    });
    return;
  }

  const statusMap: Record<string, TicketStatus> = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'in-progress': 'IN_PROGRESS',
    'pending': 'PENDING',
    'resolved': 'RESOLVED',
    'closed': 'CLOSED',
  };

  const newStatus = statusMap[status.toLowerCase()];
  if (!newStatus) {
    await respond({
      text: formatError(`Estado inválido. Usa: open, in_progress, pending, resolved, closed`),
      response_type: 'ephemeral',
    });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { number: ticketNumber.toUpperCase() },
  });

  if (!ticket) {
    await respond({
      text: formatError(`Ticket ${ticketNumber} no encontrado.`),
      response_type: 'ephemeral',
    });
    return;
  }

  const updateData: any = { status: newStatus };
  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  } else if (newStatus === 'CLOSED') {
    updateData.closedAt = new Date();
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: updateData,
  });

  await prisma.activity.create({
    data: {
      action: 'STATUS_CHANGED',
      description: `Cambiado a ${newStatus} desde Slack`,
      ticketId: ticket.id,
      userId: ticket.requesterId, // Simplificación - debería buscar usuario por slack ID
    },
  });

  await respond({
    text: formatSuccess(`Ticket ${ticketNumber} cambiado a ${newStatus}.`),
    response_type: 'ephemeral',
  });
}

function formatHelp(): string {
  return `
🎫 *Comandos de Ticket System*

*/ticket create [asunto]* - Crear un nuevo ticket
*/ticket list* - Ver tus tickets activos
*/ticket view [número]* - Ver detalle de un ticket
*/ticket assign [número] [@usuario]* - Asignar ticket
*/ticket status [número] [estado]* - Cambiar estado
*/ticket help* - Mostrar esta ayuda

*Estados válidos:* open, in_progress, pending, resolved, closed

*Ejemplos:*
\`/ticket create Problema con VPN\`
\`/ticket view TICK-2026-000001\`
\`/ticket status TICK-2026-000001 resolved\`
  `.trim();
}
