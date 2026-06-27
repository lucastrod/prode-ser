import db from './db';

/**
 * Calculates the points for a prediction based on the official score.
 * Rules:
 * - Exact Score = 6 points
 * - Correct winner/draw (Outcome) = 3 points
 * - Incorrect = 0 points
 */
export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  // 6 Puntos: Resultado exacto
  if (predHome === actualHome && predAway === actualAway) {
    return 6;
  }

  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';

  // 3 Puntos: Acierta el ganador o el empate
  if (predWinner === actualWinner) {
    return 3;
  }

  return 0; // 0 Puntos: Predicción incorrecta
}

/**
 * Recalculates points for all predictions of a specific match.
 */
export async function recalculateMatchPoints(matchId: number) {
  const match = await db.match.findUnique({
    where: { id: matchId },
  });

  if (!match || match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return;
  }

  const predictions = await db.prediction.findMany({
    where: { matchId },
  });

  for (const pred of predictions) {
    const points = calculatePoints(
      pred.predictedHomeScore,
      pred.predictedAwayScore,
      match.homeScore,
      match.awayScore
    );

    await db.prediction.update({
      where: { id: pred.id },
      data: { points },
    });
  }

  // Update standings for all users after match results are calculated
  await recalculateStandings();
}

/**
 * Recalculates total points, exact scores count, and correct outcomes count for all users.
 */
export async function recalculateStandings() {
  const users = await db.user.findMany({
    select: { id: true },
  });

  for (const user of users) {
    const predictions = await db.prediction.findMany({
      where: { userId: user.id },
    });

    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;

    for (const pred of predictions) {
      if (pred.points === null) continue;
      
      totalPoints += pred.points;
      if (pred.points === 6) {
        exactScores++;
      } else if (pred.points === 3) {
        correctOutcomes++;
      }
    }

    await db.standing.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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
  }
}
