import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MatchStatus } from '@prisma/client';
import { TEAM_TRANSLATIONS } from '@/lib/sync-matches';

export async function GET(request: Request) {
  try {
    const now = new Date();
    // Get scheduled or live matches
    const matchesToProcess = await db.match.findMany({
      where: {
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
        matchDate: { lte: now },
      },
    });

    if (matchesToProcess.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    let apiData: any;
    try {
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`, { cache: 'no-store' });
      apiData = await response.json();
    } catch (error: any) {
      console.error('Failed to fetch from ESPN API:', error.message);
      return NextResponse.json({ error: 'Error fetching ESPN API' }, { status: 500 });
    }

    const events = apiData.events || [];
    const suggestedMatches = [];

    for (const match of matchesToProcess) {
      const apiMatch = events.find((e: any) => {
        if (!e.competitions || !e.competitions[0] || !e.competitions[0].competitors) return false;
        const comps = e.competitions[0].competitors;
        if (comps.length < 2) return false;
        const homeTeamNode = comps.find((c: any) => c.homeAway === 'home');
        const awayTeamNode = comps.find((c: any) => c.homeAway === 'away');
        if (!homeTeamNode || !awayTeamNode) return false;

        const apiHome = homeTeamNode.team.displayName;
        const apiAway = awayTeamNode.team.displayName;

        const apiHomeEs = TEAM_TRANSLATIONS[apiHome] || apiHome;
        const apiAwayEs = TEAM_TRANSLATIONS[apiAway] || apiAway;

        return apiHomeEs === match.homeTeam && apiAwayEs === match.awayTeam;
      });

      if (apiMatch) {
        const comps = apiMatch.competitions[0].competitors;
        const homeTeamNode = comps.find((c: any) => c.homeAway === 'home');
        const awayTeamNode = comps.find((c: any) => c.homeAway === 'away');
        
        const homeScore = parseInt(homeTeamNode.score, 10);
        const awayScore = parseInt(awayTeamNode.score, 10);
        
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          suggestedMatches.push({
            id: match.id,
            homeScore,
            awayScore,
          });
        }
      }
    }

    return NextResponse.json({ matches: suggestedMatches });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
