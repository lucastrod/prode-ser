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
  "Uzbekistan": "Uzbekistán",
  // ESPN displayName variants
  "Congo DR": "República Democrática del Congo",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "Czechia": "República Checa",
  "Türkiye": "Turquía",
  "United States": "Estados Unidos",
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

    // Sort each group's matches chronologically — include ALL 6 matches
    const filteredGroupMatches: any[] = [];
    for (const gName in matchesByGroup) {
      const sorted = matchesByGroup[gName].sort((a, b) => {
        const timeA = parseMatchDateTime(a.date, a.time).getTime();
        const timeB = parseMatchDateTime(b.date, b.time).getTime();
        return timeA - timeB;
      });
      filteredGroupMatches.push(...sorted); // All 6 matches per group
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
 * Queries ESPN per unique date so historical matches (not just today's) get resolved.
 */
export async function syncMatchResults(apiFootballKey?: string) {
  const now = new Date();

  // 1. Get all scheduled/live matches that have passed kickoff
  const matchesToProcess = await db.match.findMany({
    where: {
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
      matchDate: { lte: now },
    },
  });

  if (matchesToProcess.length === 0) return { lockedCount: 0, finishedCount: 0 };

  let lockedCount = 0;
  let finishedCount = 0;

  // 2. Group matches by their UTC calendar date so we query ESPN once per day
  const matchesByDate = new Map<string, typeof matchesToProcess>();
  for (const match of matchesToProcess) {
    const d = new Date(match.matchDate);
    const dateStr =
      `${d.getUTCFullYear()}` +
      `${String(d.getUTCMonth() + 1).padStart(2, '0')}` +
      `${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!matchesByDate.has(dateStr)) matchesByDate.set(dateStr, []);
    matchesByDate.get(dateStr)!.push(match);
  }

  // 3. Helper: match a DB record against ESPN events list and update DB
  const tryMatchAndUpdate = async (
    match: (typeof matchesToProcess)[0],
    events: any[]
  ): Promise<boolean> => {
    const apiMatch = events.find((e: any) => {
      if (!e.competitions?.[0]?.competitors) return false;
      const comps = e.competitions[0].competitors;
      if (comps.length < 2) return false;
      const homeNode = comps.find((c: any) => c.homeAway === 'home');
      const awayNode = comps.find((c: any) => c.homeAway === 'away');
      if (!homeNode || !awayNode) return false;
      const apiHomeEs = TEAM_TRANSLATIONS[homeNode.team.displayName] || homeNode.team.displayName;
      const apiAwayEs = TEAM_TRANSLATIONS[awayNode.team.displayName] || awayNode.team.displayName;
      return apiHomeEs === match.homeTeam && apiAwayEs === match.awayTeam;
    });

    if (!apiMatch) return false;

    const comps = apiMatch.competitions[0].competitors;
    const homeNode = comps.find((c: any) => c.homeAway === 'home');
    const awayNode = comps.find((c: any) => c.homeAway === 'away');
    const homeScore = parseInt(homeNode.score, 10);
    const awayScore = parseInt(awayNode.score, 10);
    const statusShort = apiMatch.status?.type?.shortDetail ?? '';
    const isCompleted = apiMatch.status?.type?.completed === true;

    if (['FT', 'AET', 'PEN', 'Final', 'Full Time'].includes(statusShort) || isCompleted) {
      let penaltyWinner: string | null = null;
      if (statusShort === 'PEN') {
        penaltyWinner = homeScore > awayScore ? 'home' : 'away';
      }
      await db.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.FINISHED,
          homeScore: isNaN(homeScore) ? null : homeScore,
          awayScore: isNaN(awayScore) ? null : awayScore,
          penaltyWinner,
        },
      });
      await recalculateMatchPoints(match.id);
      finishedCount++;
    } else {
      // In progress
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
    return true;
  };

  // 4. For each unique date, fetch ESPN and process matches
  for (const [dateStr, dateMatches] of matchesByDate) {
    let events: any[] = [];

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
      const response = await fetch(url);
      const apiData = await response.json();
      events = apiData.events || [];
    } catch (error: any) {
      console.error(`ESPN fetch failed for date ${dateStr}:`, error.message);
      // Continue without ESPN data — we still lock matches below
    }

    for (const match of dateMatches) {
      const found = await tryMatchAndUpdate(match, events);

      // Not in ESPN feed but kickoff passed → lock predictions
      if (!found && match.status === MatchStatus.SCHEDULED) {
        await db.match.update({
          where: { id: match.id },
          data: { status: MatchStatus.LIVE },
        });
        lockedCount++;
      }
    }
  }

  return { lockedCount, finishedCount };
}
