import { NextResponse } from 'next/server';
import { Stage, MatchStatus } from '@prisma/client';
import db from '@/lib/db';
import { revalidateTag } from 'next/cache';

export async function POST() {
  try {
    const unresolvedMatches = await db.match.findMany({
      where: {
        stage: { not: Stage.GROUP },
        OR: [
          { homeTeam: { startsWith: 'W' } },
          { homeTeam: { startsWith: 'L' } },
          { awayTeam: { startsWith: 'W' } },
          { awayTeam: { startsWith: 'L' } },
        ]
      }
    });

    if (unresolvedMatches.length === 0) {
      return NextResponse.json({
        success: true,
        resolved: [],
        skipped: [],
        message: 'No hay cruces pendientes de resolución.'
      });
    }

    const resolved: string[] = [];
    const skipped: string[] = [];

    // Helper to get winner/loser team name from a match ID
    const getTeamFromRef = async (ref: string): Promise<string | null> => {
      const type = ref.substring(0, 1); // 'W' or 'L'
      const matchNum = ref.substring(1);
      
      // Find the match in DB.
      const referencedMatch = await db.match.findFirst({
        where: {
          OR: [
            { externalMatchId: matchNum },
            { externalMatchId: `r32_${matchNum}` },
            { externalMatchId: `openfootball_2026_${matchNum}` },
            { externalMatchId: `openfootball_2026_knockout_${parseInt(matchNum) - 72}` }
          ]
        }
      });

      if (!referencedMatch || referencedMatch.status !== MatchStatus.FINISHED) {
        return null;
      }

      const hs = referencedMatch.homeScore ?? 0;
      const as_ = referencedMatch.awayScore ?? 0;
      
      let winner: 'home' | 'away';
      if (referencedMatch.penaltyWinner) {
        winner = referencedMatch.penaltyWinner === 'home' ? 'home' : 'away';
      } else {
        winner = hs > as_ ? 'home' : 'away';
      }

      if (type === 'W') {
        return winner === 'home' ? referencedMatch.homeTeam : referencedMatch.awayTeam;
      } else {
        return winner === 'home' ? referencedMatch.awayTeam : referencedMatch.homeTeam;
      }
    };

    for (const match of unresolvedMatches) {
      let homeTeam = match.homeTeam;
      let awayTeam = match.awayTeam;
      let updated = false;

      if (homeTeam.startsWith('W') || homeTeam.startsWith('L')) {
        const resolvedHome = await getTeamFromRef(homeTeam);
        if (resolvedHome) {
          homeTeam = resolvedHome;
          updated = true;
        }
      }

      if (awayTeam.startsWith('W') || awayTeam.startsWith('L')) {
        const resolvedAway = await getTeamFromRef(awayTeam);
        if (resolvedAway) {
          awayTeam = resolvedAway;
          updated = true;
        }
      }

      if (updated) {
        await db.match.update({
          where: { id: match.id },
          data: { homeTeam, awayTeam }
        });
        resolved.push(`${match.homeTeam} vs ${match.awayTeam} → ${homeTeam} vs ${awayTeam}`);
      } else {
        skipped.push(`${match.homeTeam} vs ${match.awayTeam} (esperando partido de origen)`);
      }
    }

    // Si se resolvió algún cruce, los datos de matches cambiaron
    if (resolved.length > 0) {
      revalidateTag('matches');
    }

    return NextResponse.json({
      success: true,
      resolved,
      skipped,
      message: `Se resolvieron ${resolved.length} cruces. ${skipped.length} siguen esperando resultados.`
    });
  } catch (err: any) {
    console.error('Knockout resolve error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
