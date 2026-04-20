# Ticket System

Sistema de gestión de tickets de soporte técnico con colas de trabajo, SLA y colaboración en tiempo real.

## Características

- **Gestión de Tickets**: Crear, asignar y seguir tickets de soporte
- **Colas de Trabajo**: Sistema de colas tipo "Track It" para gestión de trabajo
- **SLA**: Monitoreo de tiempos de respuesta y resolución
- **Colaboración**: Comentarios internos y públicos con menciones
- **WebSockets**: Actualizaciones en tiempo real
- **Roles**: Admin, Supervisor y Agente con permisos diferenciados

## Arquitectura

```
ticket-system/
├── apps/
│   ├── web/              # Frontend React + TypeScript + Tailwind
│   └── slack-bot/        # Bot de Slack (Bolt SDK)
├── packages/
│   ├── api/              # Backend Node.js + Express + Prisma
│   ├── database/         # Esquema Prisma y cliente DB
│   └── shared/           # Tipos y utilidades compartidos
└── docker-compose.yml    # PostgreSQL
```

## Requisitos

- Node.js 20+
- PostgreSQL 16 (o Docker)
- npm 10+

## Instalación

### 1. Iniciar la base de datos

```bash
docker-compose up -d
```

### 2. Instalar dependencias

```bash
cd ticket-system
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar archivos de ejemplo
cp packages/database/.env.example packages/database/.env
cp packages/api/.env.example packages/api/.env

# Editar con tus valores
nano packages/database/.env
nano packages/api/.env
```

### 4. Configurar la base de datos

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Iniciar el desarrollo

```bash
# Terminal 1: Backend
cd packages/api
npm run dev

# Terminal 2: Frontend
cd apps/web
npm run dev
```

O con Turbo (todas las apps):

```bash
npm run dev
```

## Acceso

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555

## Usuarios de prueba

Después de ejecutar el seed:

- Email: `admin@tickets.com`
- Password: `admin123`

## Scripts disponibles

```bash
# Base de datos
npm run db:generate    # Generar cliente Prisma
npm run db:migrate     # Ejecutar migraciones
npm run db:studio      # Abrir Prisma Studio

# Desarrollo
npm run dev            # Iniciar todas las apps
npm run build          # Compilar todas las apps
```

## Estructura del proyecto

### Backend (packages/api)

- `src/routes/` - Endpoints REST
- `src/middleware/` - Auth y manejo de errores
- `src/websocket/` - Socket.io para tiempo real

### Frontend (apps/web)

- `src/pages/` - Páginas principales
- `src/components/` - Componentes reutilizables
- `src/stores/` - Estado global con Zustand
- `src/services/` - Cliente API

### Base de datos (packages/database)

- `prisma/schema.prisma` - Esquema de datos
- `prisma/seed.ts` - Datos iniciales

## Roadmap

- [x] Fase 1: Setup y base de datos
- [x] Fase 1: Autenticación
- [x] Fase 1: CRUD Tickets
- [x] Fase 1: Frontend básico
- [x] Fase 2: Sistema de Colas avanzado
- [x] Fase 2: Comentarios y colaboración
- [x] Fase 2: Motor de SLA
- [x] Fase 3: App Slack (Bolt SDK)
- [x] Fase 3: Integración bidireccional Slack

## Slack Bot

El sistema incluye un bot de Slack para gestionar tickets desde Slack.

### Comandos disponibles

```
/ticket create [asunto]     - Crear un nuevo ticket
/ticket list                - Ver tus tickets activos
/ticket view [número]       - Ver detalle de un ticket
/ticket assign [número]     - Asignar ticket
/ticket status [número]     - Cambiar estado
/ticket help                - Mostrar ayuda
```

### Iniciar el bot

```bash
cd apps/slack-bot
cp .env.example .env
# Configurar tokens de Slack
npm run dev
```

Ver [apps/slack-bot/README.md](apps/slack-bot/README.md) para la guía completa de configuración.

## Licencia

MIT
