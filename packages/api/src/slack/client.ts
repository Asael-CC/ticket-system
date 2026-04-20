import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';

// Verificar variables de entorno
const botToken = process.env.SLACK_BOT_TOKEN;
const signingSecret = process.env.SLACK_SIGNING_SECRET;
const appToken = process.env.SLACK_APP_TOKEN;

let app: App | null = null;
let webClient: WebClient | null = null;

/**
 * Inicializa el cliente de Slack
 */
export function initializeSlack(): App | null {
  if (!botToken || !signingSecret) {
    console.warn('⚠️  Slack no configurado. Setea SLACK_BOT_TOKEN y SLACK_SIGNING_SECRET en .env');
    return null;
  }

  try {
    const config: any = {
      token: botToken,
      signingSecret: signingSecret,
    };

    // Usar Socket Mode si tenemos app token (para desarrollo local)
    if (appToken) {
      config.socketMode = true;
      config.appToken = appToken;
    }

    app = new App(config);
    webClient = new WebClient(botToken);

    console.log('✅ Slack Bot inicializado');
    return app;
  } catch (error) {
    console.error('❌ Error inicializando Slack:', error);
    return null;
  }
}

/**
 * Obtiene el WebClient de Slack
 */
export function getSlackClient(): WebClient | null {
  return webClient;
}

/**
 * Obtiene la instancia de App de Bolt
 */
export function getSlackApp(): App | null {
  return app;
}

/**
 * Verifica si Slack está configurado
 */
export function isSlackConfigured(): boolean {
  return !!botToken && !!signingSecret;
}
