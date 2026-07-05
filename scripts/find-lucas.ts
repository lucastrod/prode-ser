import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'Lucas',
        mode: 'insensitive'
      }
    }
  });
  console.log('Users found:', users.map(u => ({ id: u.id, name: u.name, email: u.email })));

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeam: { contains: 'Alemania', mode: 'insensitive' } },
        { awayTeam: { contains: 'Alemania', mode: 'insensitive' } },
        { homeTeam: { contains: 'Germany', mode: 'insensitive' } },
        { awayTeam: { contains: 'Germany', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Matches with Germany:', matches.map(m => ({ id: m.id, home: m.homeTeam, away: m.awayTeam, stage: m.stage })));

  if (users.length > 0 && matches.length > 0) {
    for (const match of matches) {
      const pred = await prisma.prediction.findUnique({
        where: {
          userId_matchId: {
            userId: users[0].id,
            matchId: match.id
          }
        }
      });
      console.log(`Prediction for match ${match.id} by user ${users[0].name}:`, pred);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
