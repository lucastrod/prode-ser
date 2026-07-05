import { PrismaClient } from '@prisma/client';
import { calculatePoints } from '../src/lib/points-engine';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Lucas Castro', mode: 'insensitive' } }
  });

  if (!users.length) {
    console.log('User Lucas Castro not found.');
    return;
  }

  const lucas = users[0];
  console.log(`User: ${lucas.name} (ID: ${lucas.id})`);

  const predictions = await prisma.prediction.findMany({
    where: { userId: lucas.id },
    include: { match: true }
  });

  let totalPoints = 0;
  let exactScores = 0;
  let correctOutcomes = 0;

  console.log('\n--- PREDICTIONS ---');
  for (const pred of predictions) {
    if (pred.match.status !== 'FINISHED' || pred.match.homeScore === null || pred.match.awayScore === null) {
      continue;
    }

    const calculatedPoints = calculatePoints(
      pred.predictedHomeScore,
      pred.predictedAwayScore,
      pred.match.homeScore,
      pred.match.awayScore
    );

    totalPoints += calculatedPoints;
    if (calculatedPoints === 6) exactScores++;
    else if (calculatedPoints === 3) correctOutcomes++;

    console.log(`${pred.match.homeTeam} ${pred.match.homeScore}-${pred.match.awayScore} ${pred.match.awayTeam} | Pred: ${pred.predictedHomeScore}-${pred.predictedAwayScore} -> Points: ${calculatedPoints} (Stored: ${pred.points})`);
  }

  console.log('\n--- CALCULATED TOTALS ---');
  console.log(`Total Points: ${totalPoints}`);
  console.log(`Exact Scores (6 pts): ${exactScores}`);
  console.log(`Correct Outcomes (3 pts): ${correctOutcomes}`);

  const standing = await prisma.standing.findUnique({
    where: { userId: lucas.id }
  });

  console.log('\n--- STORED TOTALS ---');
  if (standing) {
    console.log(`Total Points: ${standing.totalPoints}`);
    console.log(`Exact Scores: ${standing.exactScores}`);
    console.log(`Correct Outcomes: ${standing.correctOutcomes}`);
  } else {
    console.log('No standing found.');
  }

  if (standing && standing.totalPoints !== totalPoints) {
    console.log('\nMISMATCH DETECTED! Updating standings...');
    await prisma.standing.update({
      where: { userId: lucas.id },
      data: {
        totalPoints,
        exactScores,
        correctOutcomes,
      }
    });
    console.log('Standings updated.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
