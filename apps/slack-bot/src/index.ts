import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@ticket-system/database';
import dotenv from 'dotenv';
import { registerTicketCommands } from './commands/tickets.js';
import { registerButtonActions } from './actions/buttons.js';
import { registerMessageHandlers } from './handlers/messages.js';

dotenv.config();

const prisma = new PrismaClient();

// Verificar variables de entorno requeridas
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: ${envVar} no está definido en .env`);
    process.exit(1);
  }
}

// Configuración de la app Bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.INFO,
});

// Registrar comandos y acciones
registerTicketCommands(app, prisma);
registerButtonActions(app, prisma);
registerMessageHandlers(app, prisma);

// Evento de app mencionada
app.event('app_mention', async ({ event, say }) => {
  await say({
    text: `¡Hola <@${event.user}>! 👋\n\nPuedes usar estos comandos:\n• \`/ticket create [asunto]\` - Crear un ticket\n• \`/ticket list\` - Ver tus tickets\n• \`/ticket view [número]\` - Ver detalle de un ticket\n• \`/ticket help\` - Ver ayuda`,
    thread_ts: event.thread_ts,
  });
});

// Manejo de errores
app.error(async (error) => {
  console.error('Error en la app de Slack:', error);
});

// Iniciar la app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack Bolt app está corriendo en Socket Mode');
    console.log('🤖 Bot listo para recibir comandos');
  } catch (error) {
    console.error('Error iniciando la app:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando conexiones...');
  await prisma.$disconnect();
  process.exit(0);
});
