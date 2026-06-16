import { Role, Stage, MatchStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import db from '../src/lib/db';

const prisma = db;

const DEFAULT_PRIZES = [
  { position: 1, title: '🥇 Primer Puesto', description: 'Cena para dos personas en restaurant premium.' },
  { position: 2, title: '🥈 Segundo Puesto', description: 'Gift Card SER de $50,000.' },
  { position: 3, title: '🥉 Tercer Puesto', description: 'Kit Mundialista SER (Remera, Gorra, Termo).' },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 0. Clean DB
  console.log('Cleaning database (predictions, standings, users)...');
  await prisma.prediction.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Admins
  console.log('Creating Admin users...');
  
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  
  const ADMIN_USERS = [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Lucas Admin',
      email: 'lucas.admin@prodeser.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      active: true,
      emailVerified: true,
    },
    {
      id: 'b1ffcd88-8d1a-5fe9-ac7e-7cc0ce491b22',
      name: 'Gonzalo Admin',
      email: 'gonzalo.admin@prodeser.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      active: true,
      emailVerified: true,
    },
  ];

  for (const userData of ADMIN_USERS) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }

  // 2. Create Standings for Admins
  console.log('Creating standings...');
  for (const userData of ADMIN_USERS) {
    await prisma.standing.upsert({
      where: { userId: userData.id },
      update: {},
      create: {
        userId: userData.id,
        totalPoints: 0,
        exactScores: 0,
        correctOutcomes: 0,
      },
    });
  }

  // 3. Create Default Prizes
  console.log('Creating prizes...');
  for (const prizeData of DEFAULT_PRIZES) {
    await prisma.prize.upsert({
      where: { position: prizeData.position },
      update: {
        title: prizeData.title,
        description: prizeData.description,
      },
      create: prizeData,
    });
  }

  // 4. Create HealthCheck Row
  console.log('Creating health check entry...');
  await prisma.healthCheck.upsert({
    where: { id: 1 },
    update: { lastPing: new Date() },
    create: { id: 1, lastPing: new Date() },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

