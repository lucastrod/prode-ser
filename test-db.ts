import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  console.log("Connection string:", connectionString ? "Set" : "Not Set");
  
  const pool = new Pool({ 
    connectionString,
    ssl: connectionString?.includes('neon.tech') ? true : undefined
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'lucas.admin@solucionesya.com.ar' }
    });
    console.log("User:", user?.id);
  } catch (error) {
    console.error("DB Error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
