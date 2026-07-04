import { calculatePoints, recalculateStandings } from '../src/lib/points-engine';
import db from '../src/lib/db';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables correctly depending on execution context
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function validatePoints() {
  console.log('Validando y recalculando todos los puntajes y standings...');
  
  try {
    // 1. Get all FINISHED matches
    const matches = await db.match.findMany({
      where: { status: 'FINISHED' }
    });
    console.log(`Encontrados ${matches.length} partidos finalizados.`);

    let updatedPredictions = 0;
    
    // 2. Recalculate predictions for each match
    for (const match of matches) {
      if (match.homeScore === null || match.awayScore === null) continue;
      
      const predictions = await db.prediction.findMany({
        where: { matchId: match.id }
      });
      
      for (const pred of predictions) {
        const correctPoints = calculatePoints(
          pred.predictedHomeScore,
          pred.predictedAwayScore,
          match.homeScore,
          match.awayScore
        );
        
        if (pred.points !== correctPoints) {
          await db.prediction.update({
            where: { id: pred.id },
            data: { points: correctPoints }
          });
          updatedPredictions++;
        }
      }
    }
    
    console.log(`Se corrigieron/actualizaron ${updatedPredictions} predicciones.`);
    
    // 3. Recalculate Standings
    console.log('Recalculando la tabla de posiciones general (Standings)...');
    await recalculateStandings();
    
    // 4. Print top 10 to verify
    const topStandings = await db.standing.findMany({
      include: { user: { select: { name: true } } },
      orderBy: [
        { totalPoints: 'desc' },
        { exactScores: 'desc' },
        { correctOutcomes: 'desc' }
      ],
      take: 10
    });
    
    console.log('\n✅ VALIDACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🏆 Top 10 Actualizado:');
    topStandings.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.user.name} - ${s.totalPoints} pts (Exactos: ${s.exactScores}, Aciertos: ${s.correctOutcomes})`);
    });

  } catch (error) {
    console.error('Error durante la validación:', error);
  } finally {
    await db.$disconnect();
  }
}

validatePoints();
