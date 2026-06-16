import fs from 'fs';
import path from 'path';
import db from './db';
import { MatchStatus, Stage } from '@prisma/client';
import { recalculateMatchPoints } from './points-engine';

export const TEAM_TRANSLATIONS: Record<string, string> = {
  "Algeria": "Argelia",
  "Argentina": "Argentina",
  "Australia": "Australia",
  "Austria": "Austria",
  "Belgium": "Bélgica",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  "Brazil": "Brasil",
  "Canada": "Canadá",
  "Cape Verde": "Cabo Verde",
  "Colombia": "Colombia",
  "Croatia": "Croacia",
  "Curaçao": "Curazao",
  "Czech Republic": "República Checa",
  "DR Congo": "República Democrática del Congo",
  "Ecuador": "Ecuador",
  "Egypt": "Egipto",
  "England": "Inglaterra",
  "France": "Francia",
  "Germany": "Alemania",
  "Ghana": "Ghana",
  "Haiti": "Haití",
  "Iran": "Irán",
  "Iraq": "Irak",
  "Ivory Coast": "Costa de Marfil",
  "Japan": "Japón",
  "Jordan": "Jordania",
  "Mexico": "México",
  "Morocco": "Marruecos",
  "Netherlands": "Países Bajos",
  "New Zealand": "Nueva Zelanda",
  "Norway": "Noruega",
  "Panama": "Panamá",
  "Paraguay": "Paraguay",
  "Portugal": "Portugal",
  "Qatar": "Qatar",
  "Saudi Arabia": "Arabia Saudita",
  "Scotland": "Escocia",
  "Senegal": "Senegal",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Spain": "España",
  "Sweden": "Suecia",
  "Switzerland": "Suiza",
  "Tunisia": "Túnez",
  "Turkey": "Turquía",
  "USA": "Estados Unidos",
  "Uruguay": "Uruguay",
  "Uzbekistan": "Uzbekistán"
};

export function parseMatchDateTime(dateStr: string, timeStr: string): Date {
  const match = timeStr.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d+)$/);
  if (match) {
    const [_, hh, mm, offset] = match;
    const offsetNum = parseInt(offset, 10);
    const offsetSign = offsetNum >= 0 ? '+' : '-';
    const offsetAbs = Math.abs(offsetNum);
    const offsetStr = `${offsetSign}${String(offsetAbs).padStart(2, '0')}:00`;
    return new Date(`${dateStr}T${hh}:${mm}:00${offsetStr}`);
  }
  return new Date(`${dateStr}T00:00:00Z`);
}

export async function importFixtures() {
  const existingCount = await db.match.count();
  if (existingCount > 0) {
    return { count: existingCount, message: 'Matches already imported' };
  }

  try {
    const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // Group-stage matches
    const rawGroupMatches = (data.matches || []).filter((m: any) => m.group);

    // Group matches by group name
    const matchesByGroup: Record<string, any[]> = {};
    for (const match of rawGroupMatches) {
      const gName = match.group.replace('Group', 'Grupo');
      if (!matchesByGroup[gName]) {
        matchesByGroup[gName] = [];
      }
      matchesByGroup[gName].push(match);
    }

    // Sort each group's matches chronologically and skip the first 2 matches
    const filteredGroupMatches: any[] = [];
    for (const gName in matchesByGroup) {
      const sorted = matchesByGroup[gName].sort((a, b) => {
        const timeA = parseMatchDateTime(a.date, a.time).getTime();
        const timeB = parseMatchDateTime(b.date, b.time).getTime();
        return timeA - timeB;
      });
      // Skip the first 2 matches of this group (Fecha 1)
      filteredGroupMatches.push(...sorted.slice(2));
    }

    // Knockout matches
    const rawKnockoutMatches = (data.matches || []).filter((m: any) => !m.group);

    // Combine matches
    const allMatchesToImport = [...filteredGroupMatches, ...rawKnockoutMatches];

    const matchesData = allMatchesToImport.map((fixture: any, idx: number) => {
      const matchDate = parseMatchDateTime(fixture.date, fixture.time);
      const homeTeam = TEAM_TRANSLATIONS[fixture.team1] || fixture.team1;
      const awayTeam = TEAM_TRANSLATIONS[fixture.team2] || fixture.team2;
      const groupName = fixture.group ? fixture.group.replace('Group', 'Grupo') : 'Fase Final';

      // Map stage enum
      let stage: Stage = Stage.GROUP;
      if (fixture.round === 'Round of 32') stage = Stage.ROUND_32;
      else if (fixture.round === 'Round of 16') stage = Stage.ROUND_16;
      else if (fixture.round === 'Quarter-final') stage = Stage.QUARTER;
      else if (fixture.round === 'Semi-final') stage = Stage.SEMI;
      else if (fixture.round === 'Match for third place') stage = Stage.THIRD_PLACE;
      else if (fixture.round === 'Final') stage = Stage.FINAL;

      return {
        externalMatchId: `openfootball_2026_${idx + 1}`,
        homeTeam,
        awayTeam,
        matchDate,
        groupName,
        stage,
        status: MatchStatus.SCHEDULED,
      };
    });

    const created = await db.match.createMany({
      data: matchesData,
    });

    return { count: created.count, message: 'Successfully imported fixtures from Ronda 2 onwards' };
  } catch (error: any) {
    console.error('Error importing fixtures from JSON:', error);
    throw new Error(`Failed to import fixtures from JSON: ${error.message}`);
  }
}

/**
 * Synchronizes match statuses and results.
 * For matches whose kickoff has passed:
 * 1. Locks the match prediction state.
 * 2. If finished (kickoff + 2 hours), retrieves or simulates official result.
 * 3. Triggers points calculations.
 */
export async function syncMatchResults(apiFootballKey?: string) {
  const now = new Date();

  // 1. Get all scheduled matches that have passed kickoff or are marked as LIVE
  const matchesToProcess = await db.match.findMany({
    where: {
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
      matchDate: { lte: now },
    },
  });

  if (matchesToProcess.length === 0) return { lockedCount: 0, finishedCount: 0 };

  let lockedCount = 0;
  let finishedCount = 0; // We keep the variable for compatibility but we won't auto-finish

  // Real Integration with ESPN API (Free, no key needed)
  let apiData: any;
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`);
    apiData = await response.json();
  } catch (error: any) {
    console.error('Failed to fetch from ESPN API:', error.message);
    return { lockedCount, finishedCount };
  }

  const events = apiData.events || [];

  for (const match of matchesToProcess) {
    // ESPN team names might differ slightly, but they are usually clean English names like "Mexico", "South Africa"
    // Let's find the matching event using TEAM_TRANSLATIONS mapped to English, or exact match
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
      const statusShort = apiMatch.status.type.shortDetail;
      
      if (['FT', 'AET', 'PEN'].includes(statusShort)) {
        // Match finished officially!
        await db.match.update({
          where: { id: match.id },
          data: {
            status: MatchStatus.FINISHED,
            homeScore: isNaN(homeScore) ? null : homeScore,
            awayScore: isNaN(awayScore) ? null : awayScore,
          },
        });
        await recalculateMatchPoints(match.id);
        finishedCount++;
      } else {
        // Update the score in DB, but KEEP status as LIVE
        await db.match.update({
          where: { id: match.id },
          data: {
            status: MatchStatus.LIVE,
            homeScore: isNaN(homeScore) ? null : homeScore,
            awayScore: isNaN(awayScore) ? null : awayScore,
          },
        });
        if (match.status === MatchStatus.SCHEDULED) lockedCount++;
      }
    } else {
      // If we didn't find the match in the API, we just lock it if it passed kickoff
      if (match.status === MatchStatus.SCHEDULED) {
        await db.match.update({
          where: { id: match.id },
          data: { status: MatchStatus.LIVE },
        });
        lockedCount++;
      }
    }
  }

  return { lockedCount, finishedCount: 0 };
}
