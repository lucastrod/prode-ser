import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  const pool = new Pool({ 
    connectionString,
    ssl: connectionString?.includes('neon.tech') ? true : undefined
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const count = await prisma.match.count();
    console.log("Total matches in database:", count);

    // Fetch group matches
    const matches = await prisma.match.findMany({
      orderBy: { matchDate: 'asc' }
    });

    console.log("\nFirst 10 matches in DB:");
    matches.slice(0, 10).forEach(m => {
      console.log(`[${m.groupName}] ${m.homeTeam} vs ${m.awayTeam} - Date: ${m.matchDate.toISOString()}`);
    });
  } catch (error) {
    console.error("DB Error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
