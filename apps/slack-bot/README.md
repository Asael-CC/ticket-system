# Slack Bot para Ticket System

Bot de Slack para interactuar con el Ticket System desde Slack.

## Características

- **Comandos Slash**: Crear, ver, asignar y gestionar tickets desde Slack
- **Acciones Interactivas**: Botones para tomar, resolver y ver tickets
- **Sync Bidireccional**: Comentarios en threads de Slack se sincronizan con el Ticket System
- **Reacciones**: Acciones rápidas mediante reacciones (✅ para resolver)

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/ticket create [asunto]` | Crear un nuevo ticket |
| `/ticket list` | Listar tickets activos |
| `/ticket view [número]` | Ver detalle de un ticket |
| `/ticket assign [número] @usuario` | Asignar ticket a un usuario |
| `/ticket status [número] [estado]` | Cambiar estado del ticket |
| `/ticket help` | Mostrar ayuda |

### Estados válidos

- `open` - Abierto
- `in_progress` - En Progreso
- `pending` - Pendiente
- `resolved` - Resuelto
- `closed` - Cerrado

## Instalación

### 1. Crear App de Slack

1. Ir a https://api.slack.com/apps
2. Click en "Create New App"
3. Seleccionar "From scratch"
4. Nombre: "Ticket System"
5. Workspace de desarrollo

### 2. Configurar OAuth & Permissions

En **OAuth & Permissions**, agregar estos scopes:

- `chat:write`
- `chat:write.public`
- `commands`
- `users:read`
- `users:read.email`
- `reactions:read`
- `reactions:write`

### 3. Habilitar Socket Mode

1. Ir a **Socket Mode** y activarlo
2. Generar **App-Level Token** con scope `connections:write`
3. Guardar el token (empieza con `xapp-`)

### 4. Crear Comandos Slash

En **Slash Commands**, crear:

| Command | Request URL | Description |
|---------|-------------|-------------|
| `/ticket` | (no necesario para Socket Mode) | Gestión de tickets |

### 5. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar con tus tokens de Slack
```

### 6. Instalar dependencias

```bash
npm install
```

### 7. Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Configuración de OAuth en Slack

### OAuth Tokens

- **Bot Token** (`SLACK_BOT_TOKEN`): Comienza con `xoxb-`
- **App Token** (`SLACK_APP_TOKEN`): Comienza con `xapp-`
- **Signing Secret**: En **Basic Information** > **App Credentials**

### Interactivity

En **Interactivity & Shortcuts**:
- Activar Interactivity
- Request URL: (no necesario para Socket Mode)

### Event Subscriptions

En **Event Subscriptions**:
- Activar Events
- Request URL: (no necesario para Socket Mode)
- Suscribirse a eventos de bot:
  - `message.channels`
  - `message.im`
  - `reaction_added`
  - `app_mention`

## Uso

### Crear un ticket

```
/ticket create Problema con VPN corporativa
```

### Ver tickets activos

```
/ticket list
```

### Ver detalle de ticket

```
/ticket view TICK-2026-000001
```

### Asignar ticket

```
/ticket assign TICK-2026-000001 @usuario
```

### Cambiar estado

```
/ticket status TICK-2026-000001 resolved
```

### Sincronización de comentarios

Cualquier mensaje escrito en el thread de un ticket de Slack se sincroniza automáticamente como comentario en el Ticket System.

### Acciones con reacciones

- ✅ `white_check_mark` o `heavy_check_mark`: Marca el ticket como resuelto
- 👀 `eyes`: Indica que estás revisando el ticket

## Desarrollo

### Estructura

```
slack-bot/
├── src/
│   ├── commands/
│   │   └── tickets.ts      # Comandos slash /ticket
│   ├── actions/
│   │   └── buttons.ts      # Acciones de botones
│   ├── handlers/
│   │   └── messages.ts     # Sync de mensajes
│   ├── lib/
│   │   ├── format.ts       # Helpers de formato
│   │   └── api.ts          # Cliente API
│   └── index.ts            # Punto de entrada
├── package.json
└── tsconfig.json
```

### Agregar nuevos comandos

Editar `src/commands/tickets.ts` y agregar un nuevo caso al switch en `registerTicketCommands`.

### Agregar nuevas acciones

Editar `src/actions/buttons.ts` y registrar nuevos handlers con `app.action()`.

## Troubleshooting

### El bot no responde

1. Verificar que los tokens son correctos
2. Confirmar que Socket Mode está activado
3. Revisar que la app esté instalada en el workspace

### No se sincronizan comentarios

1. Verificar que el ticket tenga `slackThreadTs` configurado
2. Confirmar que el bot tenga permisos `message.channels`
3. Revisar logs para errores

### Error "channel_not_found"

El bot necesita estar invitado al canal. Usa `/invite @Ticket System` en el canal.
