import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { calculatePoints, recalculateStandings } from '@/lib/points-engine';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pass = url.searchParams.get('pass');

    // Mini seguridad para que nadie más lo corra por accidente
    if (pass !== 'arreglar-puntos') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('🚀 Iniciando recálculo total de puntajes...');
    
    // 1. Traer partidos finalizados
    const matches = await db.match.findMany({
      where: { status: 'FINISHED' }
    });
    
    let updatedPreds = 0;

    // 2. Recalcular cada predicción
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
          updatedPreds++;
        }
      }
    }

    // 3. Recalcular STANDINGS desde cero
    await recalculateStandings();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Recálculo exitoso.',
      partidosEvaluados: matches.length,
      prediccionesCorregidas: updatedPreds
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
