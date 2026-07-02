import pg from 'pg';
const { Pool } = pg;

const DB_YA = 'postgresql://neondb_owner:npg_jSTUJL2wQAo1@ep-cold-art-apl2ycee.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const NEW_HOME = 3;
const NEW_AWAY = 0;

const pool = new Pool({ connectionString: DB_YA, ssl: true });

// Buscar usuario Lucas (id conocido de la búsqueda anterior)
const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
console.log(`👤 Usuario: Lucas😎 [${userId}]`);

// Buscar España vs Austria
const { rows: matches } = await pool.query(
  `SELECT id, home_team, away_team, home_score, away_score, status
   FROM matches
   WHERE (LOWER(home_team) LIKE '%espa%' OR LOWER(home_team) LIKE '%spain%')
     AND (LOWER(away_team) LIKE '%aust%')
   ORDER BY match_date`
);

if (matches.length === 0) {
  console.log('⚠️  No se encontró España vs Austria en prode-ya');
  await pool.end();
  process.exit(0);
}

const match = matches[0];
console.log(`⚽ Partido: [${match.id}] ${match.home_team} vs ${match.away_team} | Score: ${match.home_score ?? '-'}-${match.away_score ?? '-'} | Status: ${match.status}`);

// Buscar predicción existente
const { rows: preds } = await pool.query(
  `SELECT id, predicted_home_score, predicted_away_score, points FROM predictions WHERE user_id = $1 AND match_id = $2`,
  [userId, match.id]
);

if (preds.length === 0) {
  await pool.query(
    `INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score) VALUES ($1, $2, $3, $4)`,
    [userId, match.id, NEW_HOME, NEW_AWAY]
  );
  console.log(`✅ Pronóstico creado: ${NEW_HOME}-${NEW_AWAY}`);
} else {
  const pred = preds[0];
  console.log(`📋 Pronóstico actual: ${pred.predicted_home_score}-${pred.predicted_away_score} (puntos: ${pred.points ?? 'N/A'})`);
  await pool.query(
    `UPDATE predictions SET predicted_home_score = $1, predicted_away_score = $2 WHERE id = $3`,
    [NEW_HOME, NEW_AWAY, pred.id]
  );
  console.log(`✅ Pronóstico actualizado: ${pred.predicted_home_score}-${pred.predicted_away_score} → ${NEW_HOME}-${NEW_AWAY}`);
}

await pool.end();
console.log('\n🎉 Listo prode-ya.');
