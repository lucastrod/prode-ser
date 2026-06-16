import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
