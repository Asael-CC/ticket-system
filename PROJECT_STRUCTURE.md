# Ticket System - Documentación del Proyecto

> **Fecha de última actualización:** 13-Abr-2026  
> **Versión:** 1.0.0  
> **Autor:** Claude Code

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Flujos de Datos](#flujos-de-datos)
6. [API Reference](#api-reference)
7. [Base de Datos](#base-de-datos)
8. [Variables de Entorno](#variables-de-entorno)

---

## 🎯 Visión General

**Ticket System** es una aplicación de gestión de tickets de soporte técnico con las siguientes características:

- **Gestión de Tickets**: Crear, asignar y seguir tickets de soporte
- **Colas de Trabajo**: Sistema de colas tipo "Track It" para gestión de trabajo
- **SLA**: Monitoreo de tiempos de respuesta y resolución con horario laboral
- **Colaboración**: Comentarios internos y públicos con menciones
- **WebSockets**: Actualizaciones en tiempo real
- **Roles**: Admin, Supervisor, Agente y Customer con permisos diferenciados
- **Integración Slack**: Bot para gestionar tickets desde Slack

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TICKET SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Frontend   │    │    Slack     │    │   Prisma     │                  │
│  │  (React+Vite)│    │    Bot       │    │   Studio     │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         └───────────────────┼───────────────────┘                           │
│                             │                                               │
│                             ▼                                               │
│  ┌──────────────────────────────────────────────────────┐                │
│  │                    Backend API                         │                │
│  │  (Express + TypeScript + Socket.io + Prisma)           │                │
│  └──────────────────────────┬───────────────────────────┘                │
│                             │                                               │
│              ┌──────────────┼──────────────┐                              │
│              ▼              ▼              ▼                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│  │  PostgreSQL  │   │    Redis     │   │  WebSocket   │                  │
│  │   (Datos)    │   │  (Cache/WS)  │   │   (Tiempo    │                  │
│  └──────────────┘   └──────────────┘   │    Real)     │                  │
│                                          └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tecnologías Principales

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | React + TypeScript | 18.2 |
| Build Tool | Vite | 5.2 |
| Estado | Zustand + TanStack Query | 4.5 / 5.28 |
| Backend | Express + TypeScript | 4.19 |
| ORM | Prisma | 5.x |
| Base de Datos | PostgreSQL | 16 |
| WebSockets | Socket.io | 4.7 |
| Slack SDK | Bolt | 4.7 |
| Monorepo | Turborepo | 2.0 |

---

## 📁 Estructura de Carpetas

```
ticket-system/
├── apps/
│   ├── web/                    # Frontend React
│   │   ├── src/
│   │   │   ├── components/     # Componentes reutilizables
│   │   │   ├── pages/          # Páginas principales
│   │   │   ├── stores/         # Estado global (Zustand)
│   │   │   ├── services/       # Cliente API y servicios
│   │   │   ├── App.tsx         # Router y rutas
│   │   │   └── main.tsx        # Entry point
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   │
│   └── slack-bot/              # Bot de Slack
│       ├── src/
│       │   ├── commands/       # Comandos slash
│       │   ├── actions/        # Acciones de botones
│       │   ├── handlers/       # Handlers de mensajes
│       │   ├── lib/            # Utilidades
│       │   └── index.ts        # Entry point
│       ├── package.json
│       └── .env.example
│
├── packages/
│   ├── api/                    # Backend Express
│   │   ├── src/
│   │   │   ├── routes/         # Endpoints REST
│   │   │   ├── middleware/     # Auth, errores
│   │   │   ├── services/       # Lógica de negocio
│   │   │   ├── websocket/      # Socket.io handlers
│   │   │   ├── slack/          # Integración Slack
│   │   │   └── index.ts        # Server entry point
│   │   └── package.json
│   │
│   ├── database/               # Prisma + Database
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema de datos
│   │   │   ├── seed.ts         # Datos iniciales
│   │   │   └── migrations/     # Migraciones SQL
│   │   └── src/
│   │       └── index.ts        # Export del cliente
│   │
│   └── shared/                 # Tipos compartidos
│       └── src/
│           └── types.ts        # Interfaces TypeScript
│
├── docker-compose.yml          # PostgreSQL + Redis
├── turbo.json                  # Configuración Turborepo
├── package.json                # Root package
└── README.md
```

---

## 🔧 Módulos del Sistema

### 1. Frontend (`apps/web/`)

#### Componentes Principales

| Archivo | Descripción |
|---------|-------------|
| `App.tsx` | Router principal con React Router. Define rutas públicas (/login) y protegidas. Usa PrivateRoute para validar autenticación. |
| `components/Layout.tsx` | Layout principal con sidebar de navegación y header. Muestra usuario actual y permite logout. |
| `components/Badge.tsx` | Componente visual para mostrar estados de tickets (OPEN, IN_PROGRESS, etc.) con colores. |

#### Páginas

| Archivo | Función | Permisos |
|---------|---------|----------|
| `pages/Login.tsx` | Formulario de login con email/password. Guarda token en Zustand. | Público |
| `pages/Dashboard.tsx` | Vista principal con métricas: tickets totales, SLA, colas. Usa TanStack Query. | Autenticado |
| `pages/Tickets.tsx` | Lista de tickets con filtros (estado, prioridad, cola, búsqueda). Paginación. | Autenticado |
| `pages/TicketDetail.tsx` | Detalle completo de un ticket. Comentarios, asignación, cambio de estado. Oculta opciones para CUSTOMER. | Autenticado |
| `pages/NewTicket.tsx` | Formulario para crear nuevo ticket. Selección de cola y prioridad. | Autenticado |
| `pages/Queues.tsx` | Lista de colas de trabajo. Métricas por cola. | Autenticado |
| `pages/QueueDetail.tsx` | Detalle de una cola. Tickets asignados, agentes, configuración SLA. | Admin/Supervisor |

#### Estado Global

| Archivo | Descripción |
|---------|-------------|
| `stores/auth.ts` | Store Zustand con persistencia. Guarda token, user, isAuthenticated. Métodos: setAuth(), logout(). |

#### Servicios

| Archivo | Función |
|---------|---------|
| `services/api.ts` | Cliente Axios configurado con base URL, interceptores para agregar token JWT en headers. |

---

### 2. Backend API (`packages/api/`)

#### Entry Point

| Archivo | Descripción |
|---------|-------------|
| `src/index.ts` | Configura Express con middlewares (helmet, cors, morgan, json). Inicializa Socket.io, registra rutas, inicia servidor HTTP. Exporta instancia `io` para uso en otros módulos. |

#### Rutas API

| Archivo | Endpoints | Descripción |
|---------|-----------|-------------|
| `routes/auth.ts` | POST /register, POST /login, GET /me | Autenticación JWT. Login retorna token. Register crea usuarios con rol AGENT por defecto. |
| `routes/tickets.ts` | GET /, GET /:id, POST /, PATCH /:id, POST /:id/take | CRUD completo de tickets. Filtros por query params. Genera número de ticket (TICK-2024-XXXXXX). Integra con SLA service. |
| `routes/queues.ts` | GET /, GET /:id, POST /, PATCH /:id, DELETE /:id | Gestión de colas. Relación many-to-many con agentes. Cada cola tiene SLAConfig. |
| `routes/users.ts` | GET /, GET /agents, GET /:id, POST /, PATCH /:id | Gestión de usuarios. Endpoint /agents retorna solo AGENTs para asignación. |
| `routes/comments.ts` | GET /ticket/:ticketId, POST / | Comentarios de tickets. Soporta comentarios internos (isInternal=true). |
| `routes/dashboard.ts` | GET /stats, GET /activities | Métricas para dashboard. Stats incluye conteos por estado, SLA. |
| `routes/assignment.ts` | POST /auto, POST /:ticketId/assign | Asignación automática (round-robin) y manual de tickets. |
| `routes/sla.ts` | GET /:ticketId/status, GET /metrics | Estado SLA de un ticket y métricas generales. |

#### Middleware

| Archivo | Función |
|---------|---------|
| `middleware/auth.ts` | Valida JWT en Authorization header. Agrega req.user con userId, email, role. Usado con `authenticate` en rutas protegidas. |
| `middleware/errorHandler.ts` | Manejo centralizado de errores. Captura excepciones y retorna JSON con mensaje de error. |

#### Servicios

| Archivo | Clase/Función | Descripción |
|---------|---------------|-------------|
| `services/sla.ts` | `SLAService` | Cálculo de tiempos SLA considerando horario laboral. Métodos: calculateSLATimes(), getSLAStatus(), updateTicketSLA(), checkAllActiveTickets(), getSLAMetrics(). |
| `services/cron.ts` | `cronService` | Tareas programadas con node-cron. Monitorea tickets y actualiza estados SLA cada 5 minutos. |
| `services/assignment.ts` | `AssignmentService` | Lógica de asignación automática round-robin basada en carga de trabajo de agentes. |

#### WebSocket

| Archivo | Función |
|---------|---------|
| `websocket/handler.ts` | `initializeWebSocket()` | Configura Socket.io con autenticación JWT. Maneja eventos: subscribe:ticket, subscribe:queue. Emite: ticket:updated, comment:new, sla:alert. Salas: user:{id}, admin-room, ticket:{id}, queue:{id}. |

#### Integración Slack

| Archivo | Función |
|---------|---------|
| `slack/client.ts` | Cliente WebClient de Slack. Envía mensajes a canales. |
| `slack/notifications.ts` | `notifyNewTicket()`, `notifyTicketAssigned()` | Envía notificaciones de tickets a Slack. |

---

### 3. Base de Datos (`packages/database/`)

#### Schema (`prisma/schema.prisma`)

| Modelo | Descripción | Relaciones |
|--------|-------------|------------|
| `User` | Usuarios del sistema. Roles: ADMIN, AGENT, SUPERVISOR, CUSTOMER. | 1:N con Ticket (requester, assigned), 1:N con Comment, N:M con Queue |
| `Queue` | Colas de trabajo (ej: "Soporte Nivel 1"). | N:M con User (agents), 1:N con Ticket, 1:1 con SLAConfig |
| `Ticket` | Tickets de soporte. Estados: OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED. | N:1 con User (requester, assigned), N:1 con Queue, 1:N con Comment/Activity |
| `Comment` | Comentarios de tickets. isInternal=true oculta al cliente. | N:1 con Ticket, N:1 con User (author) |
| `SLAConfig` | Configuración SLA por cola. Tiempos en minutos, horario laboral. | 1:1 con Queue |
| `Activity` | Log de auditoría. Guarda acciones sobre tickets. | N:1 con Ticket, N:1 con User |

#### Seed (`prisma/seed.ts`)

Crea datos iniciales:
- 4 usuarios: admin@, agent1@, agent2@, customer@ (todos con password123)
- 2 colas: "Soporte Nivel 1" y "Infraestructura"
- SLA configs por defecto

---

### 4. Bot de Slack (`apps/slack-bot/`)

#### Entry Point

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Inicializa Bolt App en Socket Mode. Registra comandos, acciones y handlers. Verifica variables de entorno requeridas. |

#### Comandos Slash

| Archivo | Comando | Descripción |
|---------|---------|-------------|
| `commands/tickets.ts` | `/ticket create [asunto]` | Crea ticket desde Slack. Abre modal para detalles. |
| | `/ticket list` | Muestra lista de tickets del usuario con botones de acción. |
| | `/ticket view [número]` | Muestra detalle de un ticket específico. |
| | `/ticket assign [número]` | Asigna ticket al usuario de Slack. |
| | `/ticket status [número]` | Cambia estado del ticket. |
| | `/ticket help` | Muestra ayuda de comandos disponibles. |

#### Acciones Interactivas

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `actions/buttons.ts` | `ticket:take` | Botón "Tomar Ticket" - asigna al usuario actual. |
| | `ticket:resolve` | Botón "Resolver" - cambia estado a RESOLVED. |
| | `ticket:view` | Botón "Ver Detalle" - muestra info completa. |
| | `ticket:comment` | Botón "Comentar" - abre modal para añadir nota. |

#### Handlers

| Archivo | Función |
|---------|---------|
| `handlers/messages.ts` | Escucha mensajes en threads de tickets. Sync bidireccional: comentarios en Slack → Ticket System. Detecta reacción ✅ para resolver tickets. |

---

### 5. Shared (`packages/shared/`)

| Archivo | Contenido |
|---------|-----------|
| `src/types.ts` | Enums TypeScript: TicketStatus, Priority, Role. Interfaces compartidas. |
| `src/index.ts` | Exporta types y función `generateTicketNumber()`. |

---

## 🔄 Flujos de Datos

### 1. Creación de Ticket

```
Usuario (Web) → POST /api/tickets
                     ↓
              Genera número TICK-XXXXXX
                     ↓
              Crea Ticket en DB
                     ↓
              Crea Activity (CREATED)
                     ↓
              Calcula SLA (slaService.updateTicketSLA)
                     ↓
              Notifica a Slack (si configurado)
                     ↓
              Emite WebSocket ticket:updated
```

### 2. Asignación de Ticket

```
Agente → Click "Tomar Ticket"
              ↓
        POST /api/tickets/:id/take
              ↓
        Actualiza assignedToId + status=IN_PROGRESS
              ↓
        Crea Activity (ASSIGNED)
              ↓
        Emite WebSocket ticket:updated
              ↓
        Notifica en tiempo real a suscriptores
```

### 3. Comentario en Ticket

```
Usuario → Escribe comentario → POST /api/comments
                                    ↓
                              Crea Comment en DB
                                    ↓
                              Si es primer comentario:
                                Marca firstResponseAt
                                    ↓
                              Emite WebSocket comment:new
                                    ↓
                              Sync a Slack (si tiene slackThreadTs)
```

### 4. WebSocket - Conexión

```
Frontend → socket.connect()
              ↓
     Envia token JWT en handshake.auth
              ↓
     Middleware valida token
              ↓
     Se une a salas:
       - user:{userId}
       - admin-room (si es ADMIN/SUPERVISOR)
              ↓
     Escucha eventos:
       - ticket:updated
       - comment:new
       - sla:alert
```

---

## 📚 API Reference

### Autenticación

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@tickets.com",
  "password": "password123"
}

Response:
{
  "user": { "id", "email", "name", "role" },
  "token": "jwt_token_here"
}
```

### Tickets

```http
# Listar tickets (con filtros)
GET /api/tickets?status=OPEN&priority=HIGH&page=1&limit=20
Authorization: Bearer {token}

# Obtener ticket
GET /api/tickets/{id}

# Crear ticket
POST /api/tickets
{
  "subject": "Problema con impresora",
  "description": "No imprime",
  "queueId": "uuid",
  "priority": "HIGH"
}

# Actualizar ticket
PATCH /api/tickets/{id}
{
  "status": "IN_PROGRESS",
  "assignedToId": "uuid"
}

# Tomar ticket (auto-asignar)
POST /api/tickets/{id}/take
```

### Colas

```http
GET /api/queues              # Listar colas
GET /api/queues/{id}         # Detalle de cola
POST /api/queues             # Crear cola
PATCH /api/queues/{id}       # Actualizar cola
```

### SLA

```http
GET /api/sla/{ticketId}/status   # Estado SLA de un ticket
GET /api/sla/metrics             # Métricas generales
```

---

## 🗄️ Base de Datos

### Diagrama ER

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │       │    Queue     │       │   Ticket     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────┤ id (PK)      │◄──────┤ id (PK)      │
│ email        │   M:M │ name         │   1:M │ number       │
│ password     │       │ description  │       │ subject      │
│ name         │       │ color        │       │ description  │
│ role         │       │ isActive     │       │ status       │
│ isActive     │       └──────────────┘       │ priority     │
└──────────────┘                              │ requesterId  │
       │                                      │ queueId      │
       │                                      │ assignedToId │
       │                                      │ slaDeadline  │
       │                                      │ ...          │
       │                                      └──────────────┘
       │                                             │
       │                                             │
       │  1:M                      1:M               │
       └─────────────────┬─────────────────────────┘
                         │
                  ┌──────▼───────┐
                  │   Comment    │
                  ├──────────────┤
                  │ id (PK)      │
                  │ content      │
                  │ isInternal   │
                  │ ticketId     │
                  │ authorId     │
                  └──────────────┘
```

---

## 🔐 Variables de Entorno

### Backend (`packages/api/.env`)

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/ticketsystem"

# JWT
JWT_SECRET="tu_secret_key_aqui"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Slack (opcional)
SLACK_BOT_TOKEN="xoxb-..."
SLACK_SIGNING_SECRET="..."
SLACK_CHANNEL_ID="C..."
```

### Frontend (`apps/web/.env`)

```bash
VITE_API_URL="http://localhost:3001/api"
```

### Slack Bot (`apps/slack-bot/.env`)

```bash
SLACK_BOT_TOKEN="xoxb-..."
SLACK_SIGNING_SECRET="..."
SLACK_APP_TOKEN="xapp-..."
```

---

## 🧪 Testing

### Usuarios de Prueba

| Email | Rol | Password |
|-------|-----|----------|
| admin@tickets.com | ADMIN | password123 |
| agent1@tickets.com | AGENT | password123 |
| agent2@tickets.com | AGENT | password123 |
| customer@tickets.com | CUSTOMER | password123 |

### URLs Locales

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| Prisma Studio | http://localhost:5555 |

---

## 📝 Notas de Implementación

1. **Autenticación WebSocket**: El token JWT se envía en `socket.handshake.auth.token`. El middleware valida y guarda `userId` y `userRole` en el socket.

2. **Rol CUSTOMER**: Los usuarios con rol CUSTOMER tienen UI limitada:
   - No ven el botón "Tomar Ticket"
   - No pueden cambiar el estado del ticket
   - No ven comentarios marcados como `isInternal=true`
   - No ven el selector de "Asignado a"

3. **SLA Horario Laboral**: El cálculo de tiempos límite considera:
   - Días laborables (configurable, default: Lunes-Viernes)
   - Horario de trabajo (configurable, default: 9:00-18:00)
   - Excluye fines de semana y horas fuera de trabajo

4. **Sync Slack**: Cuando se crea un comentario en el Ticket System, si el ticket tiene `slackThreadTs`, se reenvía al thread de Slack. Viceversa: comentarios en el thread de Slack se sincronizan al Ticket System.

5. **Migraciones**: Al agregar el rol CUSTOMER, se creó una migración SQL manual para PostgreSQL usando `ALTER TYPE "Role" ADD VALUE 'CUSTOMER'`.

---

**Fin del documento**
