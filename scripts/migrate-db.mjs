/**
 * migrate-db.mjs
 * Migración completa de datos entre dos bases de datos PostgreSQL (Neon).
 *
 * USO:
 *   OLD_DATABASE_URL="postgresql://..." NEW_DATABASE_URL="postgresql://..." node scripts/migrate-db.mjs
 *
 * O editá las variables directamente abajo.
 */

import pg from 'pg';
const { Client } = pg;

const OLD_URL = process.env.OLD_DATABASE_URL || '';
const NEW_URL = process.env.NEW_DATABASE_URL || '';

if (!OLD_URL || !NEW_URL) {
  console.error('❌ Faltan variables OLD_DATABASE_URL y/o NEW_DATABASE_URL');
  console.error('   Ejemplo: OLD_DATABASE_URL="..." NEW_DATABASE_URL="..." node scripts/migrate-db.mjs');
  process.exit(1);
}

const sslOpts = { rejectUnauthorized: false };

async function connect(url, label) {
  const client = new Client({ connectionString: url, ssl: sslOpts });
  await client.connect();
  console.log(`✅ Conectado a ${label}`);
  return client;
}

async function main() {
  console.log('\n🚀 Iniciando migración de base de datos...\n');

  const oldDb = await connect(OLD_URL, 'DB vieja');
  const newDb = await connect(NEW_URL, 'DB nueva');

  try {
    // =========================================================
    // 1. APLICAR SCHEMA EN LA DB NUEVA
    // =========================================================
    console.log('\n📐 Aplicando schema en DB nueva...');
    await newDb.query(`
      DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "Stage" AS ENUM ('GROUP', 'ROUND_32', 'ROUND_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password_hash" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'USER',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "email_verified" BOOLEAN NOT NULL DEFAULT false,
        "verification_token" TEXT,
        "avatar_url" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

      CREATE TABLE IF NOT EXISTS "matches" (
        "id" SERIAL NOT NULL,
        "external_match_id" TEXT,
        "home_team" TEXT NOT NULL,
        "away_team" TEXT NOT NULL,
        "match_date" TIMESTAMP(3) NOT NULL,
        "group_name" TEXT NOT NULL,
        "stage" "Stage" NOT NULL DEFAULT 'GROUP',
        "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
        "home_score" INTEGER,
        "away_score" INTEGER,
        "penalty_winner" TEXT,
        CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "matches_external_match_id_key" ON "matches"("external_match_id");

      CREATE TABLE IF NOT EXISTS "predictions" (
        "id" SERIAL NOT NULL,
        "user_id" UUID NOT NULL,
        "match_id" INTEGER NOT NULL,
        "predicted_home_score" INTEGER NOT NULL,
        "predicted_away_score" INTEGER NOT NULL,
        "points" INTEGER,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");

      CREATE TABLE IF NOT EXISTS "standings" (
        "id" SERIAL NOT NULL,
        "user_id" UUID NOT NULL,
        "total_points" INTEGER NOT NULL DEFAULT 0,
        "exact_scores" INTEGER NOT NULL DEFAULT 0,
        "correct_outcomes" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "standings_user_id_key" ON "standings"("user_id");

      CREATE TABLE IF NOT EXISTS "prizes" (
        "id" SERIAL NOT NULL,
        "position" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "prizes_position_key" ON "prizes"("position");

      CREATE TABLE IF NOT EXISTS "health_checks" (
        "id" INTEGER NOT NULL DEFAULT 1,
        "last_ping" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
      );

      ALTER TABLE "predictions" DROP CONSTRAINT IF EXISTS "predictions_user_id_fkey";
      ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      ALTER TABLE "predictions" DROP CONSTRAINT IF EXISTS "predictions_match_id_fkey";
      ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      ALTER TABLE "standings" DROP CONSTRAINT IF EXISTS "standings_user_id_fkey";
      ALTER TABLE "standings" ADD CONSTRAINT "standings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✅ Schema aplicado correctamente');

    // =========================================================
    // 2. MIGRAR USERS
    // =========================================================
    console.log('\n👥 Migrando usuarios...');
    const { rows: users } = await oldDb.query('SELECT * FROM users ORDER BY created_at');
    console.log(`   Encontrados: ${users.length} usuarios`);
    for (const u of users) {
      await newDb.query(
        `INSERT INTO users (id, name, email, password_hash, role, active, email_verified, verification_token, avatar_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET name=$2, email=$3`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.active, u.email_verified, u.verification_token, u.avatar_url, u.created_at]
      );
    }
    console.log(`✅ ${users.length} usuarios migrados`);

    // =========================================================
    // 3. MIGRAR MATCHES
    // =========================================================
    console.log('\n⚽ Migrando partidos...');
    const { rows: matches } = await oldDb.query('SELECT * FROM matches ORDER BY id');
    console.log(`   Encontrados: ${matches.length} partidos`);
    for (const m of matches) {
      await newDb.query(
        `INSERT INTO matches (id, external_match_id, home_team, away_team, match_date, group_name, stage, status, home_score, away_score, penalty_winner)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET status=$8, home_score=$9, away_score=$10, penalty_winner=$11`,
        [m.id, m.external_match_id, m.home_team, m.away_team, m.match_date, m.group_name, m.stage, m.status, m.home_score, m.away_score, m.penalty_winner]
      );
    }
    // Resetear la secuencia del SERIAL para que el próximo id sea correcto
    if (matches.length > 0) {
      const maxId = Math.max(...matches.map(m => m.id));
      await newDb.query(`SELECT setval('matches_id_seq', $1)`, [maxId]);
    }
    console.log(`✅ ${matches.length} partidos migrados`);

    // =========================================================
    // 4. MIGRAR PREDICTIONS
    // =========================================================
    console.log('\n🎯 Migrando predicciones...');
    const { rows: predictions } = await oldDb.query('SELECT * FROM predictions ORDER BY id');
    console.log(`   Encontradas: ${predictions.length} predicciones`);
    for (const p of predictions) {
      await newDb.query(
        `INSERT INTO predictions (id, user_id, match_id, predicted_home_score, predicted_away_score, points, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, match_id) DO UPDATE SET predicted_home_score=$4, predicted_away_score=$5, points=$6`,
        [p.id, p.user_id, p.match_id, p.predicted_home_score, p.predicted_away_score, p.points, p.created_at]
      );
    }
    if (predictions.length > 0) {
      const maxId = Math.max(...predictions.map(p => p.id));
      await newDb.query(`SELECT setval('predictions_id_seq', $1)`, [maxId]);
    }
    console.log(`✅ ${predictions.length} predicciones migradas`);

    // =========================================================
    // 5. MIGRAR STANDINGS
    // =========================================================
    console.log('\n🏆 Migrando standings...');
    const { rows: standings } = await oldDb.query('SELECT * FROM standings ORDER BY id');
    console.log(`   Encontrados: ${standings.length} standings`);
    for (const s of standings) {
      await newDb.query(
        `INSERT INTO standings (id, user_id, total_points, exact_scores, correct_outcomes, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id) DO UPDATE SET total_points=$3, exact_scores=$4, correct_outcomes=$5, updated_at=$6`,
        [s.id, s.user_id, s.total_points, s.exact_scores, s.correct_outcomes, s.updated_at]
      );
    }
    if (standings.length > 0) {
      const maxId = Math.max(...standings.map(s => s.id));
      await newDb.query(`SELECT setval('standings_id_seq', $1)`, [maxId]);
    }
    console.log(`✅ ${standings.length} standings migrados`);

    // =========================================================
    // 6. MIGRAR PRIZES
    // =========================================================
    console.log('\n🎁 Migrando premios...');
    const { rows: prizes } = await oldDb.query('SELECT * FROM prizes ORDER BY position');
    console.log(`   Encontrados: ${prizes.length} premios`);
    for (const p of prizes) {
      await newDb.query(
        `INSERT INTO prizes (id, position, title, description, enabled)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (position) DO UPDATE SET title=$3, description=$4, enabled=$5`,
        [p.id, p.position, p.title, p.description, p.enabled]
      );
    }
    if (prizes.length > 0) {
      const maxId = Math.max(...prizes.map(p => p.id));
      await newDb.query(`SELECT setval('prizes_id_seq', $1)`, [maxId]);
    }
    console.log(`✅ ${prizes.length} premios migrados`);

    // =========================================================
    // 7. HEALTH CHECK
    // =========================================================
    await newDb.query(`
      INSERT INTO health_checks (id, last_ping) VALUES (1, NOW())
      ON CONFLICT (id) DO UPDATE SET last_ping = NOW()
    `);

    // =========================================================
    // RESUMEN
    // =========================================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log(`   👥 Usuarios:     ${users.length}`);
    console.log(`   ⚽ Partidos:     ${matches.length}`);
    console.log(`   🎯 Predicciones: ${predictions.length}`);
    console.log(`   🏆 Standings:    ${standings.length}`);
    console.log(`   🎁 Premios:      ${prizes.length}`);
    console.log('\n🔑 Próximo paso: actualizar las env vars en Vercel con la nueva DB URL');
    console.log('   Dashboard Vercel → prode-ser → Settings → Environment Variables\n');

  } catch (err) {
    console.error('\n❌ Error durante la migración:', err.message);
    throw err;
  } finally {
    await oldDb.end();
    await newDb.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
