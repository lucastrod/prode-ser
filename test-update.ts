import db from './src/lib/db';
import { recalculateMatchPoints } from './src/lib/points-engine';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const matchData = {
      id: 1,
      homeTeam: "México",
      awayTeam: "Sudáfrica",
      matchDate: "2026-06-11T04:00:00.000Z",
      groupName: "Group A",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 0
    };

    console.log('Updating match...');
    const updated = await db.match.update({
      where: { id: matchData.id },
      data: {
        homeTeam: matchData.homeTeam,
        awayTeam: matchData.awayTeam,
        matchDate: new Date(matchData.matchDate),
        groupName: matchData.groupName,
        status: "FINISHED",
        homeScore: matchData.homeScore,
        awayScore: matchData.awayScore,
      },
    });

    console.log('Recalculating points...');
    await recalculateMatchPoints(matchData.id);
    
    console.log('Success!');
  } catch (err: any) {
    console.error('Error:', err);
  }
}

main();
