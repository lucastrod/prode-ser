import pg from 'pg';
const { Pool } = pg;

// ─── Configuración ───────────────────────────────────────────────────────────
const DB_SER = process.env.DB_SER || 'postgresql://neondb_owner:npg_fekzVT7u0YxU@ep-gentle-lake-ats6fusm.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const DB_YA  = process.env.DB_YA  || 'postgresql://neondb_owner:npg_jSTUJL2wQAo1@ep-cold-art-apl2ycee.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const USER_NAME    = 'lucas castro';  // búsqueda case-insensitive
const HOME_TEAM    = 'España';
const AWAY_TEAM    = 'Austria';
const NEW_HOME     = 3;
const NEW_AWAY     = 0;

async function fixPrediction(label, connectionString) {
  const pool = new Pool({ connectionString, ssl: true });
  console.log(`\n══════════════════════════════════════`);
  console.log(`🔧 Procesando: ${label}`);
  console.log(`══════════════════════════════════════`);

  try {
    // 1. Buscar usuario Lucas Castro
    const { rows: users } = await pool.query(
      `SELECT id, name, email FROM users WHERE LOWER(name) LIKE $1`,
      [`%${USER_NAME}%`]
    );

    if (users.length === 0) {
      console.log(`⚠️  No se encontró usuario con nombre "Lucas Castro"`);
      await pool.end();
      return;
    }

    // Mostrar todos los usuarios encontrados
    console.log(`👤 Usuario(s) encontrado(s):`);
    users.forEach(u => console.log(`   - ${u.name} (${u.email}) [id: ${u.id}]`));

    const user = users[0];

    // 2. Buscar el partido España vs Austria (búsqueda flexible)
    const { rows: matches } = await pool.query(
      `SELECT id, home_team, away_team, match_date, home_score, away_score, status
       FROM matches
       WHERE (LOWER(home_team) LIKE '%espa%' OR LOWER(home_team) LIKE '%spain%')
         AND (LOWER(away_team) LIKE '%aust%')
       ORDER BY match_date`
    );

    if (matches.length === 0) {
      console.log(`⚠️  No se encontró el partido España vs Austria`);
      // Intentar búsqueda inversa
      const { rows: altMatches } = await pool.query(
        `SELECT id, home_team, away_team, match_date, home_score, away_score, status
         FROM matches
         WHERE (LOWER(away_team) LIKE '%espa%' OR LOWER(away_team) LIKE '%spain%')
           AND (LOWER(home_team) LIKE '%aust%')
         ORDER BY match_date`
      );
      if (altMatches.length > 0) {
        console.log(`ℹ️  Encontrado con equipos invertidos:`);
        altMatches.forEach(m => console.log(`   - [${m.id}] ${m.home_team} vs ${m.away_team} | Score: ${m.home_score}-${m.away_score} | Status: ${m.status}`));
      } else {
        const { rows: allMatches } = await pool.query(
          `SELECT id, home_team, away_team FROM matches WHERE LOWER(home_team) LIKE '%espa%' OR LOWER(away_team) LIKE '%espa%'`
        );
        console.log(`🔍 Partidos con "España":`, allMatches);
      }
      await pool.end();
      return;
    }

    console.log(`⚽ Partido(s) encontrado(s):`);
    matches.forEach(m => console.log(`   - [${m.id}] ${m.home_team} vs ${m.away_team} | Score: ${m.home_score ?? '-'}-${m.away_score ?? '-'} | Status: ${m.status} | Fecha: ${m.match_date}`));

    const match = matches[0];

    // 3. Buscar el pronóstico existente
    const { rows: preds } = await pool.query(
      `SELECT id, predicted_home_score, predicted_away_score, points
       FROM predictions
       WHERE user_id = $1 AND match_id = $2`,
      [user.id, match.id]
    );

    if (preds.length === 0) {
      console.log(`ℹ️  Lucas Castro NO tiene pronóstico para este partido. Creando nuevo...`);
      await pool.query(
        `INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
         VALUES ($1, $2, $3, $4)`,
        [user.id, match.id, NEW_HOME, NEW_AWAY]
      );
      console.log(`✅ Pronóstico creado: ${NEW_HOME}-${NEW_AWAY}`);
    } else {
      const pred = preds[0];
      console.log(`\n📋 Pronóstico actual: ${pred.predicted_home_score}-${pred.predicted_away_score} (puntos: ${pred.points ?? 'N/A'})`);

      if (pred.predicted_home_score === NEW_HOME && pred.predicted_away_score === NEW_AWAY) {
        console.log(`✅ El pronóstico ya es ${NEW_HOME}-${NEW_AWAY}. No se necesita cambio.`);
      } else {
        await pool.query(
          `UPDATE predictions
           SET predicted_home_score = $1, predicted_away_score = $2
           WHERE id = $3`,
          [NEW_HOME, NEW_AWAY, pred.id]
        );
        console.log(`✅ Pronóstico actualizado: ${pred.predicted_home_score}-${pred.predicted_away_score} → ${NEW_HOME}-${NEW_AWAY}`);
      }
    }

  } catch (err) {
    console.error(`❌ Error en ${label}:`, err.message);
  } finally {
    await pool.end();
  }
}

// ─── Ejecutar en ambas DBs ────────────────────────────────────────────────────
await fixPrediction('PRODE-SER', DB_SER);
await fixPrediction('PRODE-YA',  DB_YA);

console.log(`\n🎉 Listo.`);
