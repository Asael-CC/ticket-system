import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Hashear contraseñas
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Crear o actualizar usuarios de prueba
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tickets.com' },
    update: {},
    create: {
      email: 'admin@tickets.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const agent1 = await prisma.user.upsert({
    where: { email: 'agent1@tickets.com' },
    update: {},
    create: {
      email: 'agent1@tickets.com',
      name: 'Agent One',
      password: hashedPassword,
      role: 'AGENT',
    },
  })

  const agent2 = await prisma.user.upsert({
    where: { email: 'agent2@tickets.com' },
    update: {},
    create: {
      email: 'agent2@tickets.com',
      name: 'Agent Two',
      password: hashedPassword,
      role: 'AGENT',
    },
  })

  // Usuario supervisor (gestiona agentes y colas)
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@tickets.com' },
    update: {},
    create: {
      email: 'supervisor@tickets.com',
      name: 'Supervisor User',
      password: hashedPassword,
      role: 'SUPERVISOR',
    },
  })

  // Usuario cliente (solo crea tickets y comenta)
  const customer = await prisma.user.upsert({
    where: { email: 'customer@tickets.com' },
    update: {},
    create: {
      email: 'customer@tickets.com',
      name: 'Customer User',
      password: hashedPassword,
      role: 'CUSTOMER',
    },
  })

  // Verificar si existen colas, si no, crearlas
  const existingQueues = await prisma.queue.count()

  if (existingQueues === 0) {
    // Crear colas
    const queueL1 = await prisma.queue.create({
      data: {
        name: 'Soporte Nivel 1',
        description: 'Tickets de primer nivel de soporte',
        color: '#10B981',
        agents: {
          connect: [{ id: agent1.id }, { id: agent2.id }],
        },
        slaConfig: {
          create: {
            firstResponseTimeMinutes: 30,
            resolutionTimeMinutes: 240,
          },
        },
      },
    })

    const queueInfra = await prisma.queue.create({
      data: {
        name: 'Infraestructura',
        description: 'Problemas de servidores y red',
        color: '#F59E0B',
        agents: {
          connect: [{ id: agent1.id }],
        },
        slaConfig: {
          create: {
            firstResponseTimeMinutes: 60,
            resolutionTimeMinutes: 480,
          },
        },
      },
    })

    console.log('Queues created:', queueL1.name, queueInfra.name)
  }

  console.log('Seed completed!')
  console.log('Admin:', admin.email)
  console.log('Supervisor:', supervisor.email)
  console.log('Agent 1:', agent1.email)
  console.log('Agent 2:', agent2.email)
  console.log('Customer (solo crea tickets):', customer.email)
  console.log('Password for all users: password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
