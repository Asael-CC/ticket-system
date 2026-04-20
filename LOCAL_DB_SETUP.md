# Configuración de PostgreSQL Local (sin Docker)

Si prefieres no usar Docker, sigue estos pasos.

## Opción 1: PostgreSQL nativo en Ubuntu/Debian

### Instalar PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Crear base de datos y usuario

```bash
# Cambiar al usuario postgres
sudo -u postgres psql
```

En el prompt de PostgreSQL:

```sql
-- Crear base de datos
CREATE DATABASE ticketsystem;

-- Crear usuario
CREATE USER tickets WITH ENCRYPTED PASSWORD 'tickets123';

-- Dar privilegios
GRANT ALL PRIVILEGES ON DATABASE ticketsystem TO tickets;

-- Salir
\q
```

### Configurar conexión

Edita `packages/database/.env`:

```env
DATABASE_URL="postgresql://tickets:tickets123@localhost:5432/ticketsystem"
```

---

## Opción 2: Usar servicio en la nube (Render, Railway, etc.)

Servicios gratuitos que ofrecen PostgreSQL:
- **Render.com** - PostgreSQL gratuito
- **Railway.app** - PostgreSQL con límite
- **Supabase** - PostgreSQL con UI

Obtén el string de conexión y ponlo en `packages/database/.env`

---

## Ejecutar migraciones

Una vez configurada la DB:

```bash
cd /home/asael/ollama/ticket-system

# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Opcional: Popular con datos de prueba
npm run db:seed
```

---

## Verificar conexión

```bash
# Abrir Prisma Studio
npm run db:studio
```

Debería abrirse en `http://localhost:5555`

---

## Troubleshooting

### Error: "role does not exist"

```bash
# Verificar usuarios
sudo -u postgres psql -c "\du"

# Crear usuario si falta
sudo -u postgres createuser -P tickets
```

### Error: "database does not exist"

```bash
# Crear base de datos manualmente
sudo -u postgres createdb ticketsystem --owner=tickets
```

### Error: "connection refused"

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Reiniciar si es necesario
sudo systemctl restart postgresql

# Verificar puerto
sudo netstat -plunt | grep postgres
```

### Error: "password authentication failed"

Edita el archivo de configuración:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Cambia la línea:
```
local   all             all             peer
```

A:
```
local   all             all             md5
```

Luego reinicia:
```bash
sudo systemctl restart postgresql
```
