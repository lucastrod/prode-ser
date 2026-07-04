import pg from 'pg';
const { Pool } = pg;

// URL de producción (sacada de tus otros scripts)
const DB_URL = 'postgresql://neondb_owner:npg_jSTUJL2wQAo1@ep-cold-art-apl2ycee.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const pool = new Pool({ connectionString: DB_URL, ssl: true });

function calculatePoints(predHome, predAway, actualHome, actualAway) {
  // 6 Puntos: Resultado exacto (goles en 90/120 min)
  if (predHome === actualHome && predAway === actualAway) {
    return 6;
  }

  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';

  // 3 Puntos: Acierta el ganador o el empate
  if (predWinner === actualWinner) {
    return 3;
  }

  // 0 Puntos
  return 0;
}

async function run() {
  console.log('🚀 Iniciando recálculo total de puntajes en PRODUCCIÓN...\n');
  
  try {
    // 1. Traer partidos finalizados
    const { rows: matches } = await pool.query(
      `SELECT id, home_score, away_score FROM matches WHERE status = 'FINISHED' AND home_score IS NOT NULL AND away_score IS NOT NULL`
    );
    console.log(`⚽ Partidos finalizados encontrados: ${matches.length}`);

    // 2. Traer TODAS las predicciones
    const { rows: predictions } = await pool.query(`SELECT * FROM predictions`);
    console.log(`🎯 Predicciones totales encontradas: ${predictions.length}`);

    let updatedPreds = 0;

    // 3. Recalcular cada predicción
    for (const pred of predictions) {
      const match = matches.find(m => m.id === pred.match_id);
      if (!match) continue; // El partido no está finalizado o no existe

      const correctPoints = calculatePoints(
        pred.predicted_home_score,
        pred.predicted_away_score,
        match.home_score,
        match.away_score
      );

      // Actualizar solo si está en NULL o está mal calculado (lo que pasó desde ayer)
      if (pred.points !== correctPoints) {
        await pool.query(
          `UPDATE predictions SET points = $1 WHERE id = $2`,
          [correctPoints, pred.id]
        );
        updatedPreds++;
      }
    }
    console.log(`✅ Predicciones corregidas/calculadas: ${updatedPreds}`);

    // 4. Recalcular STANDINGS desde cero
    console.log('\n🏆 Recalculando Tabla de Posiciones general...');
    const { rows: users } = await pool.query(`SELECT id, name FROM users`);
    
    // Obtener predicciones actualizadas
    const { rows: allPreds } = await pool.query(`SELECT user_id, points FROM predictions WHERE points IS NOT NULL`);
    
    for (const user of users) {
      const userPreds = allPreds.filter(p => p.user_id === user.id);
      
      let totalPoints = 0;
      let exactScores = 0;
      let correctOutcomes = 0;
      
      for (const p of userPreds) {
        totalPoints += p.points;
        if (p.points === 6) exactScores++;
        if (p.points === 3) correctOutcomes++;
      }
      
      // Upsert standing
      await pool.query(
        `INSERT INTO standings (user_id, total_points, exact_scores, correct_outcomes, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE SET 
           total_points = $2, 
           exact_scores = $3, 
           correct_outcomes = $4, 
           updated_at = NOW()`,
        [user.id, totalPoints, exactScores, correctOutcomes]
      );
    }
    
    console.log(`✅ Standings actualizados para ${users.length} usuarios.`);
    
    // Mostrar Top 5 para validar
    const { rows: top } = await pool.query(
      `SELECT u.name, s.total_points, s.exact_scores, s.correct_outcomes 
       FROM standings s JOIN users u ON s.user_id = u.id 
       ORDER BY s.total_points DESC, s.exact_scores DESC, s.correct_outcomes DESC LIMIT 5`
    );
    
    console.log('\n🏅 Top 5 Actualizado:');
    top.forEach((t, i) => console.log(`${i+1}. ${t.name} - ${t.total_points} pts`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    console.log('\nFin del proceso.');
  }
}

run();
