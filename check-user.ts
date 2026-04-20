import { PrismaClient } from '@ticket-system/database';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@tickets.com' } });
  console.log('User found:', !!user);
  if (user) {
    console.log('Password hash:', user.password);
    const valid = await bcrypt.compare('password123', user.password);
    console.log('Password valid:', valid);
  }
  await prisma.$disconnect();
}

check().catch(console.error);
