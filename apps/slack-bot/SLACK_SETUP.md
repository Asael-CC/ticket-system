# Guía Completa: Crear App de Slack para Ticket System

Esta guía te lleva paso a paso para crear y configurar tu app de Slack desde cero.

---

## Paso 1: Crear la App en Slack API

### 1.1 Acceder a Slack API

1. Ve a https://api.slack.com/apps
2. Inicia sesión con tu cuenta de Slack
3. Verás una lista de tus apps (si tienes alguna)

### 1.2 Crear Nueva App

1. Haz click en el botón **"Create New App"** (es un botón verde)
2. Selecciona **"From scratch"** (crear desde cero)
3. Aparecerá un modal:

   | Campo | Valor |
   |-------|-------|
   | **App Name** | `Ticket System` |
   | **Development Slack Workspace** | Selecciona tu workspace de desarrollo |

4. Haz click en **"Create App"**

### 1.3 Verás el Dashboard de tu App

Aparecerán varias secciones. Necesitamos configurar:
- ✅ OAuth & Permissions
- ✅ Socket Mode
- ✅ Slash Commands
- ✅ Event Subscriptions

---

## Paso 2: Configurar OAuth & Permissions

### 2.1 Navegar a OAuth

En el menú lateral izquierdo, busca **"OAuth & Permissions"** y haz click.

### 2.2 Agregar Scopes del Bot

Ve a la sección **"Scopes"** > **"Bot Token Scopes"**

Haz click en **"Add an OAuth Scope"** y agrega estos uno por uno:

```
chat:write
chat:write.public
commands
users:read
users:read.email
reactions:read
reactions:write
```

### 2.3 Instalar App al Workspace

1. Ve al principio de la página OAuth
2. Haz click en **"Install to Workspace"** (botón verde)
3. Verás una pantalla de permisos - haz click en **"Allow"**
4. Se generarán los tokens:

### 2.4 Guardar los Tokens IMPORTANTE

Después de instalar, verás:

**Bot User OAuth Token** - Copia este valor:
```
xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX
```

Guárdalo como `SLACK_BOT_TOKEN`

Luego ve a **Basic Information** en el menú lateral y copia:

**Signing Secret**:
```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Guárdalo como `SLACK_SIGNING_SECRET`

---

## Paso 3: Habilitar Socket Mode

Socket Mode permite que tu bot se conecte directamente sin necesidad de una URL pública (ideal para desarrollo local).

### 3.1 Activar Socket Mode

1. En el menú lateral, busca **"Socket Mode"**
2. Cambia el toggle a **"Enable"** (ON)
3. Aparecerá un modal para generar token

### 3.2 Generar App-Level Token

1. Haz click en **"Generate Token"**
2. En el modal:
   - **Token Name**: `development` (o el que prefieras)
   - **Scopes**: Selecciona `connections:write`
3. Haz click en **"Generate"**

### 3.3 Guardar App-Level Token

Copia el token generado:
```
xapp-XX-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX
```

Guárdalo como `SLACK_APP_TOKEN`

---

## Paso 4: Crear Slash Commands

### 4.1 Navegar a Slash Commands

1. Menú lateral > **"Slash Commands"**
2. Haz click en **"Create New Command"**

### 4.2 Configurar el Comando

Rellena el formulario:

| Campo | Valor |
|-------|-------|
| **Command** | `/ticket` |
| **Request URL** | Dejar vacío (usamos Socket Mode) |
| **Short Description** | `Gestión de tickets de soporte` |
| **Usage Hint** | `[create|list|view|assign|status] [args]` |

Haz click en **"Save"**

---

## Paso 5: Habilitar Event Subscriptions

Los eventos permiten que el bot responda a mensajes y reacciones.

### 5.1 Activar Event Subscriptions

1. Menú lateral > **"Event Subscriptions"**
2. Cambia toggle **"Enable Events"** a ON

### 5.2 Suscribirse a Eventos de Bot

Desplázate a **"Subscribe to bot events"**

Haz click en **"Add Bot User Event"** y agrega:

```
message.channels
message.im
reaction_added
app_mention
```

### 5.3 Guardar Cambios

Haz click en **"Save Changes"** al final de la página

---

## Paso 6: Configurar tu Archivo .env

En tu proyecto, ve a `apps/slack-bot/`:

```bash
cd apps/slack-bot
cp .env.example .env
```

Edita el archivo `.env` con los valores que guardaste:

```env
# Slack App Credentials
SLACK_BOT_TOKEN=xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX
SLACK_SIGNING_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SLACK_APP_TOKEN=xapp-XX-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX

# URLs del sistema
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

---

## Paso 7: Instalar y Ejecutar

### 7.1 Instalar Dependencias

```bash
# Desde la raíz del proyecto
cd /home/asael/ollama/ticket-system
npm install
```

### 7.2 Ejecutar el Bot

```bash
cd apps/slack-bot
npm run dev
```

Deberías ver:
```
⚡️ Slack Bolt app está corriendo en Socket Mode
🤖 Bot listo para recibir comandos
```

---

## Paso 8: Invitar el Bot a un Canal

### 8.1 Crear Canal de Pruebas (opcional)

En Slack:
1. Crea un canal privado o público, ej: `#tickets`

### 8.2 Invitar al Bot

En el canal, escribe:
```
/invite @Ticket System
```

(O el nombre que le pusiste a tu app)

---

## Paso 9: Probar el Bot

### 9.1 Ver Ayuda

En cualquier canal donde esté el bot:
```
/ticket help
```

Debería responder con la lista de comandos.

### 9.2 Crear Ticket de Prueba

```
/ticket create Problema de prueba desde Slack
```

### 9.3 Ver Tickets

```
/ticket list
```

---

## Solución de Problemas

### "command_not_found" o el comando no aparece

1. Verifica que guardaste los cambios en Slash Commands
2. Reinstala la app al workspace: OAuth & Permissions > Reinstall

### El bot no responde

1. Verifica los tokens en `.env`
2. Confirma que Socket Mode está ON
3. Revisa los logs del bot en la terminal

### "not_in_channel" o "channel_not_found"

El bot necesita estar en el canal:
```
/invite @Ticket System
```

### Los mensajes en thread no se sincronizan

1. Verifica que el ticket se creó con notificación a Slack
2. Confirma que el evento `message.channels` está suscrito
3. El bot debe estar en el canal donde se creó el ticket

---

## Resumen de Tokens

| Variable | Donde encontrar | Formato |
|----------|-----------------|---------|
| `SLACK_BOT_TOKEN` | OAuth & Permissions > Bot User OAuth Token | `xoxb-...` |
| `SLACK_SIGNING_SECRET` | Basic Information > App Credentials | `xxxxxxxx...` |
| `SLACK_APP_TOKEN` | Socket Mode > App-Level Tokens | `xapp-...` |

---

## Siguientes Pasos

1. ✅ Crear app de Slack
2. ✅ Configurar tokens
3. ✅ Ejecutar bot localmente
4. ⬜ Crear usuario de prueba en Ticket System
5. ⬜ Probar flujo completo
6. ⬜ Desplegar a producción

Para producción, considera:
- Usar HTTP Mode en lugar de Socket Mode (requiere URL pública)
- Configurar un servicio como ngrok para desarrollo
- Desplegar en un servidor con SSL
