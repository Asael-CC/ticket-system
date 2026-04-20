import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Crear usuarios de prueba
    const admin = await prisma.user.create({
        data: {
            email: 'admin@tickets.com',
            name: 'Admin User',
            password: '$2b$10$YourHashedPasswordHere', // En producción hashear
            role: 'ADMIN',
        },
    });
    const agent1 = await prisma.user.create({
        data: {
            email: 'agent1@tickets.com',
            name: 'Agent One',
            password: '$2b$10$YourHashedPasswordHere',
            role: 'AGENT',
        },
    });
    const agent2 = await prisma.user.create({
        data: {
            email: 'agent2@tickets.com',
            name: 'Agent Two',
            password: '$2b$10$YourHashedPasswordHere',
            role: 'AGENT',
        },
    });
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
                    resolutionTimeMinutes: 240, // 4 horas
                },
            },
        },
    });
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
                    resolutionTimeMinutes: 480, // 8 horas
                },
            },
        },
    });
    console.log('Seed completed!');
    console.log('Admin:', admin.email);
    console.log('Queues:', queueL1.name, queueInfra.name);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map