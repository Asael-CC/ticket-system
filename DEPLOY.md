# Guía de Despliegue en Railway

Esta guía te ayuda a desplegar el Ticket System en Railway para que puedas acceder desde cualquier lugar.

## Prerrequisitos

- Cuenta en [Railway](https://railway.app) (puedes usar GitHub para registrarte)
- Código subido a un repositorio de GitHub
- Git instalado en tu máquina

## Paso 1: Preparar el repositorio

Asegúrate de tener estos archivos creados:
- `Dockerfile` - Configuración del contenedor
- `railway.json` - Configuración de Railway
- `.env.example` - Variables de entorno de ejemplo

Sube los cambios a GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Paso 2: Crear el proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Click en **New Project**
3. Selecciona **Deploy from GitHub repo**
4. Selecciona tu repositorio del ticket-system
5. Railway detectará automáticamente el Dockerfile

## Paso 3: Añadir Base de Datos PostgreSQL

1. En tu proyecto de Railway, click en **New** → **Database** → **Add PostgreSQL**
2. Espera a que se cree la base de datos
3. Railway generará automáticamente la variable `DATABASE_URL`

## Paso 4: Configurar Variables de Entorno

Ve a la pestaña **Variables** de tu servicio y añade:

```bash
NODE_ENV=production
JWT_SECRET=genera-una-clave-larga-y-segura-aqui
PORT=3001
```

Para generar un JWT_SECRET seguro:
```bash
openssl rand -base64 32
```

## Paso 5: Configurar Dominio

1. Ve a la pestaña **Settings** de tu servicio
2. En **Public Networking**, click en **Generate Domain**
3. Railway te dará una URL como: `https://ticket-system-production.up.railway.app`

## Paso 6: Ejecutar Migraciones

1. Ve a la pestaña **Deploy** de tu servicio
2. Click en los **tres puntos** → **Run Command**
3. Ejecuta:
   ```bash
   npx prisma migrate deploy
   ```
4. Luego ejecuta el seed:
   ```bash
   npx prisma db seed
   ```

## Paso 7: Desplegar Frontend

El frontend necesita ser desplegado por separado. Tienes dos opciones:

### Opción A: Netlify (Recomendada)

1. Crea cuenta en [Netlify](https://netlify.com)
2. Importa tu repositorio de GitHub
3. Configura el build:
   - Build command: `npm run build`
   - Publish directory: `apps/web/dist`
   - Base directory: `apps/web`
4. Añade variable de entorno:
   ```
   VITE_API_URL=https://tu-api-de-railway.up.railway.app
   ```

### Opción B: Railway (Más simple)

1. En tu proyecto de Railway, click **New** → **Empty Service**
2. Configura el Dockerfile para el frontend:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Paso 8: Verificar Despliegue

1. Abre la URL de tu backend: `https://tu-api.up.railway.app`
2. Deberías ver "Ticket System API is running"
3. Prueba los endpoints:
   ```
   GET https://tu-api.up.railway.app/health
   ```

## URLs de Acceso

Después del despliegue tendrás:

| Servicio | URL |
|----------|-----|
| Backend API | `https://tu-api.up.railway.app` |
| Frontend | `https://tu-frontend.netlify.app` o `https://tu-frontend.up.railway.app` |

## Usuarios de Prueba

Los mismos usuarios del seed:

| Email | Rol | Password |
|-------|-----|----------|
| admin@tickets.com | ADMIN | password123 |
| supervisor@tickets.com | SUPERVISOR | password123 |
| agent1@tickets.com | AGENT | password123 |
| customer@tickets.com | CUSTOMER | password123 |

## Actualizaciones

Para actualizar el sistema:

1. Haz cambios localmente
2. Sube a GitHub: `git push origin main`
3. Railway redeployará automáticamente

## Troubleshooting

### Error de conexión a base de datos
- Verifica que `DATABASE_URL` esté configurada
- Asegúrate de que la base de datos esté en el mismo proyecto de Railway

### Error CORS
- Añade tu dominio de frontend a la configuración CORS del backend
- En `packages/api/src/index.ts`, actualiza el origen permitido

### Migraciones fallidas
- Ve a Railway → tu servicio → Deploy
- Click en "View Logs" para ver errores
- Ejecuta migraciones manualmente desde "Run Command"

## Recursos

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Railway Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/railway)
