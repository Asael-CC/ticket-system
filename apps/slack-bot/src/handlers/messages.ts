import { App } from '@slack/bolt';
import { PrismaClient } from '@ticket-system/database';

export function registerMessageHandlers(app: App, prisma: PrismaClient) {
  // Escuchar mensajes en threads para sincronizar como comentarios
  app.message(async ({ message, client, context }) => {
    // Ignorar mensajes del propio bot
    if (message.subtype === 'bot_message') return;
    if (!('text' in message)) return;

    // Verificar si el mensaje está en un thread que corresponde a un ticket
    const threadTs = (message as any).thread_ts as string | undefined;
    if (!threadTs) return; // Solo procesar mensajes en threads

    try {
      // Buscar ticket por el slackThreadTs
      const ticket = await prisma.ticket.findFirst({
        where: { slackThreadTs: threadTs },
      });

      if (!ticket) return; // No es un thread de ticket

      // Obtener info del usuario de Slack
      const userInfo = await client.users.info({ user: message.user });
      const slackEmail = userInfo.user?.profile?.email;

      if (!slackEmail) {
        console.log('No se pudo obtener email del usuario de Slack');
        return;
      }

      // Buscar o crear usuario
      let user = await prisma.user.findUnique({
        where: { email: slackEmail },
      });

      if (!user) {
        const slackName = userInfo.user?.real_name || userInfo.user?.name || 'Slack User';
        user = await prisma.user.create({
          data: {
            email: slackEmail,
            name: slackName,
            password: 'NOT_SET_SLACK_USER',
            role: 'AGENT',
          },
        });
      }

      // Crear comentario desde Slack (no es interno, es público)
      const comment = await prisma.comment.create({
        data: {
          content: message.text as string,
          isInternal: false, // Los comentarios desde Slack son públicos por defecto
          ticketId: ticket.id,
          authorId: user.id,
          slackMessageTs: message.ts,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Crear actividad
      await prisma.activity.create({
        data: {
          action: 'COMMENT_ADDED',
          description: 'Comentario añadido desde Slack',
          ticketId: ticket.id,
          userId: user.id,
          metadata: {
            commentId: comment.id,
            fromSlack: true,
            slackUser: message.user,
          },
        },
      });

      // Si es la primera respuesta, actualizar firstResponseAt
      if (!ticket.firstResponseAt) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { firstResponseAt: new Date() },
        });
      }

      console.log(`💬 Comentario sincronizado desde Slack: ${ticket.number}`);
    } catch (error) {
      console.error('Error sincronizando mensaje de Slack:', error);
    }
  });

  // Manejar reacciones a mensajes de tickets
  app.event('reaction_added', async ({ event, client }) => {
    try {
      // Obtener el mensaje original
      const result = await client.conversations.history({
        channel: event.item.channel,
        latest: event.item.ts,
        limit: 1,
        inclusive: true,
      });

      const message = result.messages?.[0];
      if (!message) return;

      // Buscar ticket por thread_ts o mensaje directo
      const ticket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { slackThreadTs: event.item.ts },
            { slackThreadTs: message.thread_ts },
          ],
        },
      });

      if (!ticket) return;

      // Acciones basadas en reacciones
      const reaction = event.reaction;

      if (reaction === 'white_check_mark' || reaction === 'heavy_check_mark') {
        // Marcar como resuelto
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
          },
        });

        await prisma.activity.create({
          data: {
            action: 'STATUS_CHANGED',
            description: 'Marcado como RESUELTO desde reacción de Slack',
            ticketId: ticket.id,
            userId: ticket.requesterId,
          },
        });

        console.log(`✅ Ticket ${ticket.number} resuelto desde reacción`);
      }

      if (reaction === 'eyes') {
        // Indicar que alguien está revisando
        console.log(`👀 Ticket ${ticket.number} está siendo revisado`);
      }
    } catch (error) {
      console.error('Error procesando reacción:', error);
    }
  });
}
