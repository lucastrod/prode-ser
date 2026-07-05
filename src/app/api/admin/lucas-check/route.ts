import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { calculatePoints } from '@/lib/points-engine';
import { revalidateTag } from 'next/cache';

export async function GET() {
  try {
    const users = await db.user.findMany({
      where: { name: { contains: 'Lucas Castro', mode: 'insensitive' } }
    });

    if (!users.length) return NextResponse.json({ error: 'Usuario Lucas Castro no encontrado' });
    const lucas = users[0];

    const predictions = await db.prediction.findMany({
      where: { userId: lucas.id },
      include: { match: true }
    });

    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;
    const detail = [];

    for (const pred of predictions) {
      if (pred.match.status !== 'FINISHED' || pred.match.homeScore === null || pred.match.awayScore === null) {
        continue;
      }

      const points = calculatePoints(
        pred.predictedHomeScore,
        pred.predictedAwayScore,
        pred.match.homeScore,
        pred.match.awayScore
      );

      totalPoints += points;
      if (points === 6) exactScores++;
      else if (points === 3) correctOutcomes++;

      detail.push({
        match: `${pred.match.homeTeam} ${pred.match.homeScore}-${pred.match.awayScore} ${pred.match.awayTeam}`,
        prediction: `${pred.predictedHomeScore}-${pred.predictedAwayScore}`,
        pointsCalculated: points,
        pointsStored: pred.points
      });

      // Fix mismatch if any
      if (points !== pred.points) {
        await db.prediction.update({
          where: { id: pred.id },
          data: { points }
        });
      }
    }

    const standing = await db.standing.findUnique({
      where: { userId: lucas.id }
    });

    let standingUpdated = false;
    if (!standing || standing.totalPoints !== totalPoints || standing.exactScores !== exactScores || standing.correctOutcomes !== correctOutcomes) {
      await db.standing.upsert({
        where: { userId: lucas.id },
        create: {
          userId: lucas.id,
          totalPoints,
          exactScores,
          correctOutcomes,
        },
        update: {
          totalPoints,
          exactScores,
          correctOutcomes,
          updatedAt: new Date(),
        },
      });
      standingUpdated = true;
      revalidateTag('standings', 'max');
    }

    return NextResponse.json({
      success: true,
      message: 'Puntos de Lucas Castro validados y actualizados.',
      calculado: {
        totalPoints,
        exactScores,
        correctOutcomes,
      },
      almacenadoPrevio: standing ? {
        totalPoints: standing.totalPoints,
        exactScores: standing.exactScores,
        correctOutcomes: standing.correctOutcomes,
      } : null,
      seActualizoStanding: standingUpdated,
      detallePartidos: detail
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
