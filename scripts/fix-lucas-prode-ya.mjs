import pg from 'pg';
const { Pool } = pg;

const DB_YA = 'postgresql://neondb_owner:npg_jSTUJL2wQAo1@ep-cold-art-apl2ycee.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const pool = new Pool({ connectionString: DB_YA, ssl: true });

const USER_EMAIL = 'lucas@solucionesya.com.ar';
const MATCH_ID   = 113;  // Inglaterra vs RD Congo
const NEW_HOME   = 2;
const NEW_AWAY   = 1;

// Buscar usuario
const { rows: [user] } = await pool.query(
  `SELECT id, name, email FROM users WHERE email = $1`,
  [USER_EMAIL]
);

if (!user) {
  console.log('❌ Usuario no encontrado:', USER_EMAIL);
  await pool.end();
  process.exit(1);
}

console.log(`👤 Usuario: ${user.name} (${user.email})`);

// Verificar el partido
const { rows: [match] } = await pool.query(
  `SELECT id, home_team, away_team, status, home_score, away_score FROM matches WHERE id = $1`,
  [MATCH_ID]
);
console.log(`⚽ Partido: [${match.id}] ${match.home_team} vs ${match.away_team} | Status: ${match.status}`);

// Buscar pronóstico existente
const { rows: preds } = await pool.query(
  `SELECT id, predicted_home_score, predicted_away_score, points FROM predictions WHERE user_id = $1 AND match_id = $2`,
  [user.id, MATCH_ID]
);

if (preds.length === 0) {
  console.log(`ℹ️  No tiene pronóstico. Creando 2-1...`);
  await pool.query(
    `INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
     VALUES ($1, $2, $3, $4)`,
    [user.id, MATCH_ID, NEW_HOME, NEW_AWAY]
  );
  console.log(`✅ Pronóstico creado: ${NEW_HOME}-${NEW_AWAY}`);
} else {
  const pred = preds[0];
  console.log(`📋 Pronóstico actual: ${pred.predicted_home_score}-${pred.predicted_away_score}`);
  
  await pool.query(
    `UPDATE predictions SET predicted_home_score = $1, predicted_away_score = $2 WHERE id = $3`,
    [NEW_HOME, NEW_AWAY, pred.id]
  );
  console.log(`✅ Actualizado: ${pred.predicted_home_score}-${pred.predicted_away_score} → ${NEW_HOME}-${NEW_AWAY}`);
}

await pool.end();
console.log('\n🎉 Listo en PRODE-YA.');
