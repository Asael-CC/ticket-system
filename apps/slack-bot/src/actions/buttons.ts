import { App } from '@slack/bolt';
import { PrismaClient } from '@ticket-system/database';
import { formatTicketBlocks, formatError, formatSuccess } from '../lib/format.js';

export function registerButtonActions(app: App, prisma: PrismaClient) {
  // Acción: Tomar ticket
  app.action(/take_ticket:.*/, async ({ ack, body, action, client, respond }) => {
    await ack();

    const ticketId = (action as any).action_id.split(':')[1];
    const slackUserId = body.user.id;

    try {
      // Buscar usuario de Slack en la base de datos
      const user = await prisma.user.findFirst({
        where: {
          email: { contains: 'slack.com' }, // Simplificación
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!user) {
        await respond({
          text: formatError('No estás registrado en el sistema. Crea un ticket primero.'),
          response_type: 'ephemeral',
        });
        return;
      }

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: user.id,
          status: 'IN_PROGRESS',
        },
        include: {
          requester: true,
          assignedTo: true,
          queue: true,
        },
      });

      // Crear actividad
      await prisma.activity.create({
        data: {
          action: 'ASSIGNED',
          description: `Tomado desde Slack por ${user.name}`,
          ticketId: ticket.id,
          userId: user.id,
        },
      });

      // Actualizar mensaje original
      await client.chat.update({
        channel: body.channel!.id!,
        ts: (body as any).message.ts,
        text: `Ticket ${ticket.number} tomado por ${user.name}`,
        blocks: [
          ...formatTicketBlocks(ticket),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `✅ Tomado por *${user.name}* desde Slack`,
              },
            ],
          },
        ],
      });

      await respond({
        text: formatSuccess(`Ticket ${ticket.number} asignado a ti.`),
        response_type: 'ephemeral',
      });
    } catch (error) {
      console.error('Error tomando ticket:', error);
      await respond({
        text: formatError('No se pudo tomar el ticket. Intenta nuevamente.'),
        response_type: 'ephemeral',
      });
    }
  });

  // Acción: Resolver ticket
  app.action(/resolve_ticket:.*/, async ({ ack, body, action, client, respond }) => {
    await ack();

    const ticketId = (action as any).action_id.split(':')[1];

    try {
      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
        include: {
          requester: true,
          assignedTo: true,
          queue: true,
        },
      });

      await prisma.activity.create({
        data: {
          action: 'STATUS_CHANGED',
          description: 'Marcado como RESUELTO desde Slack',
          ticketId: ticket.id,
          userId: ticket.assignedToId || ticket.requesterId,
        },
      });

      await client.chat.update({
        channel: body.channel!.id!,
        ts: (body as any).message.ts,
        text: `Ticket ${ticket.number} resuelto`,
        blocks: [
          ...formatTicketBlocks(ticket),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `✅ *Resuelto* desde Slack`,
              },
            ],
          },
        ],
      });

      await respond({
        text: formatSuccess(`Ticket ${ticket.number} marcado como resuelto.`),
        response_type: 'ephemeral',
      });
    } catch (error) {
      console.error('Error resolviendo ticket:', error);
      await respond({
        text: formatError('No se pudo resolver el ticket.'),
        response_type: 'ephemeral',
      });
    }
  });

  // Acción: Ver ticket detallado
  app.action(/view_ticket:.*/, async ({ ack, body, action, client, respond }) => {
    await ack();

    const ticketId = (action as any).action_id.split(':')[1];

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
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
          text: formatError('Ticket no encontrado.'),
          response_type: 'ephemeral',
        });
        return;
      }

      await client.chat.postEphemeral({
        channel: body.channel!.id!,
        user: body.user.id,
        text: `Detalle del ticket ${ticket.number}`,
        blocks: formatTicketBlocks(ticket, true),
      });
    } catch (error) {
      console.error('Error viendo ticket:', error);
      await respond({
        text: formatError('No se pudo cargar el ticket.'),
        response_type: 'ephemeral',
      });
    }
  });

  // Acción: Tomar ticket desde notificación original (del package api)
  app.action('take_ticket', async ({ ack, body, action, client, respond }) => {
    await ack();

    const ticketId = (action as any).value;
    const slackUserId = body.user.id;

    try {
      // Obtener info del usuario de Slack
      const userInfo = await client.users.info({ user: slackUserId });
      const slackEmail = userInfo.user?.profile?.email;

      let user = null;
      if (slackEmail) {
        user = await prisma.user.findUnique({
          where: { email: slackEmail },
        });
      }

      // Si no existe, buscar por nombre o crear usuario temporal
      if (!user) {
        const slackName = userInfo.user?.real_name || userInfo.user?.name || `Slack User`;
        user = await prisma.user.findFirst({
          where: { name: { contains: slackName, mode: 'insensitive' } },
        });

        if (!user) {
          await respond({
            text: formatError('No tienes una cuenta en Ticket System. Contacta al administrador.'),
            response_type: 'ephemeral',
          });
          return;
        }
      }

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: user.id,
          status: 'IN_PROGRESS',
        },
        include: {
          requester: true,
          assignedTo: true,
          queue: true,
        },
      });

      await prisma.activity.create({
        data: {
          action: 'ASSIGNED',
          description: `Tomado desde Slack por ${user.name}`,
          ticketId: ticket.id,
          userId: user.id,
        },
      });

      // Actualizar mensaje original
      await client.chat.update({
        channel: body.channel!.id!,
        ts: (body as any).message.ts,
        text: `Ticket ${ticket.number} tomado por ${user.name}`,
        blocks: [
          ...formatTicketBlocks(ticket),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `✅ Asignado a *${user.name}*`,
              },
            ],
          },
        ],
      });

      await respond({
        text: formatSuccess(`Ticket ${ticket.number} asignado a ti.`),
        response_type: 'ephemeral',
      });
    } catch (error) {
      console.error('Error tomando ticket:', error);
      await respond({
        text: formatError('No se pudo tomar el ticket. Intenta nuevamente.'),
        response_type: 'ephemeral',
      });
    }
  });
}
