import { NextRequest, NextResponse } from 'next/server';
import { Stage, MatchStatus } from '@prisma/client';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { TEAM_TRANSLATIONS, parseMatchDateTime } from '@/lib/sync-matches';

interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface GroupStanding {
  groupName: string;
  teams: TeamStanding[];
}

function buildGroupStandings(matches: any[]): GroupStanding[] {
  const groups: Record<string, Record<string, TeamStanding>> = {};

  for (const match of matches) {
    if (match.status !== MatchStatus.FINISHED || match.homeScore === null || match.awayScore === null) continue;

    const g = match.groupName;
    if (!groups[g]) groups[g] = {};

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const hs = match.homeScore;
    const as_ = match.awayScore;

    if (!groups[g][homeTeam]) groups[g][homeTeam] = { team: homeTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
    if (!groups[g][awayTeam]) groups[g][awayTeam] = { team: awayTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };

    const home = groups[g][homeTeam];
    const away = groups[g][awayTeam];

    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as_;
    away.goalsFor += as_; away.goalsAgainst += hs;
    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;

    if (hs > as_) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (hs < as_) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, teamsMap]) => ({
      groupName,
      teams: Object.values(teamsMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      }),
    }));
}

// Fallback qualifiers — used when group stage is not yet finished in DB
const FALLBACK_QUALIFIERS: Record<string, string> = {
  "1A": "México",                     "2A": "Sudáfrica",
  "1B": "Suiza",                      "2B": "Canadá",
  "1C": "Brasil",                     "2C": "Marruecos",
  "1D": "Estados Unidos",             "2D": "Australia",
  "1E": "Alemania",                   "2E": "Costa de Marfil",
  "1F": "Países Bajos",               "2F": "Japón",
  "1G": "Bélgica",                    "2G": "Egipto",
  "1H": "España",                     "2H": "Cabo Verde",
  "1I": "Francia",                    "2I": "Noruega",
  "1J": "Argentina",                  "2J": "Austria",
  "1K": "Colombia",                   "2K": "Portugal",
  "1L": "Inglaterra",                 "2L": "Croacia",
  "3A/B/C/D/F": "Paraguay",
  "3C/D/F/G/H": "Suecia",
  "3C/E/F/H/I": "Ecuador",
  "3E/H/I/J/K": "República Democrática del Congo",
  "3B/E/F/I/J": "Bosnia y Herzegovina",
  "3A/E/H/I/J": "Senegal",
  "3E/F/G/I/J": "Argelia",
  "3D/E/I/J/L": "Ghana",
};

/** Returns true if a team name is an unresolved placeholder (e.g. "1A", "3A/B/C", "W73", "L74") */
function isPlaceholder(name: string): boolean {
  return (
    /^[12][A-L]$/.test(name) ||           // 1A, 2B, ...
    /^3[A-L/]+$/.test(name) ||            // 3A/B/C/D/F, ...
    /^[WL]\d+$/.test(name) ||             // W73, L74 (winner/loser of match N)
    name.startsWith('[')                   // [1° Grupo A], etc.
  );
}

function resolveFromStandings(
  placeholder: string,
  groupStandings: GroupStanding[]
): string | null {
  const simpleMatch = placeholder.match(/^([12])([A-L])$/);
  if (simpleMatch) {
    const pos = parseInt(simpleMatch[1]) - 1;
    const letter = simpleMatch[2];
    const full = `Grupo ${letter}`;
    const group = groupStandings.find((g) => g.groupName === full);
    return group?.teams[pos]?.team ?? null;
  }
  // Third-place slots are resolved via fallback only
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceReset = searchParams.get('reset') === 'true';

    if (forceReset) {
      await db.prediction.deleteMany({
        where: { match: { stage: { not: Stage.GROUP } } }
      });
      await db.match.deleteMany({
        where: { stage: { not: Stage.GROUP } }
      });
    }

    // 1. Build group standings from DB
    const groupMatches = await db.match.findMany({
      where: { stage: Stage.GROUP },
      orderBy: { matchDate: 'asc' },
    });
    const groupStandings = buildGroupStandings(groupMatches);

    // 2. Get all existing knockout matches
    let knockoutMatches = await db.match.findMany({
      where: { stage: { not: Stage.GROUP } },
      orderBy: { matchDate: 'asc' },
    });

    // If no knockout matches exist, import them from fixture/worldcup.json first!
    if (knockoutMatches.length === 0) {
      const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);
      
      const rawKnockoutMatches = (data.matches || []).filter((m: any) => !m.group);
      
      const matchesToInsert = rawKnockoutMatches.map((fixture: any, idx: number) => {
        const matchDate = parseMatchDateTime(fixture.date, fixture.time);
        const homeTeam = TEAM_TRANSLATIONS[fixture.team1] || fixture.team1;
        const awayTeam = TEAM_TRANSLATIONS[fixture.team2] || fixture.team2;
        const groupName = 'Fase Final';
        
        let stage: Stage = Stage.GROUP;
        if (fixture.round === 'Round of 32') stage = Stage.ROUND_32;
        else if (fixture.round === 'Round of 16') stage = Stage.ROUND_16;
        else if (fixture.round === 'Quarter-final') stage = Stage.QUARTER;
        else if (fixture.round === 'Semi-final') stage = Stage.SEMI;
        else if (fixture.round === 'Match for third place') stage = Stage.THIRD_PLACE;
        else if (fixture.round === 'Final') stage = Stage.FINAL;
        
        return {
          externalMatchId: `openfootball_2026_knockout_${idx + 1}`,
          homeTeam,
          awayTeam,
          matchDate,
          groupName,
          stage,
          status: MatchStatus.SCHEDULED,
        };
      });
      
      await db.match.createMany({
        data: matchesToInsert
      });
      
      // Reload
      knockoutMatches = await db.match.findMany({
        where: { stage: { not: Stage.GROUP } },
        orderBy: { matchDate: 'asc' },
      });
    }

    // 3. Deduplicate: if there are multiple matches with the same stage + matchDate,
    //    keep the one with a resolved team name (not placeholder), delete the others.
    const seen = new Map<string, { id: number; resolved: boolean }>();
    const toDelete: number[] = [];

    for (const m of knockoutMatches) {
      const key = `${m.stage}_${new Date(m.matchDate).toISOString()}`;
      const isResolved = !isPlaceholder(m.homeTeam) && !isPlaceholder(m.awayTeam);

      if (!seen.has(key)) {
        seen.set(key, { id: m.id, resolved: isResolved });
      } else {
        const existing = seen.get(key)!;
        if (isResolved && !existing.resolved) {
          // This one is better — delete the old one, keep this
          toDelete.push(existing.id);
          seen.set(key, { id: m.id, resolved: true });
        } else {
          // Keep the existing one, delete this duplicate
          toDelete.push(m.id);
        }
      }
    }

    // Delete duplicate matches (cascade predictions first if any)
    if (toDelete.length > 0) {
      await db.prediction.deleteMany({ where: { matchId: { in: toDelete } } });
      await db.match.deleteMany({ where: { id: { in: toDelete } } });
    }

    // 4. Reload after dedup
    const remaining = await db.match.findMany({
      where: { stage: { not: Stage.GROUP } },
      orderBy: { matchDate: 'asc' },
    });

    // 5. Resolve placeholders on remaining matches
    const resolved: string[] = [];
    const skipped: string[] = [];

    for (const match of remaining) {
      const homeIsPlaceholder = isPlaceholder(match.homeTeam);
      const awayIsPlaceholder = isPlaceholder(match.awayTeam);

      if (!homeIsPlaceholder && !awayIsPlaceholder) continue; // Already resolved

      let homeTeam = match.homeTeam;
      let awayTeam = match.awayTeam;
      let changed = false;

      if (homeIsPlaceholder) {
        const fromStandings = resolveFromStandings(match.homeTeam, groupStandings);
        const result = fromStandings ?? FALLBACK_QUALIFIERS[match.homeTeam] ?? null;
        if (result) {
          homeTeam = result;
          changed = true;
        }
      }

      if (awayIsPlaceholder) {
        const fromStandings = resolveFromStandings(match.awayTeam, groupStandings);
        const result = fromStandings ?? FALLBACK_QUALIFIERS[match.awayTeam] ?? null;
        if (result) {
          awayTeam = result;
          changed = true;
        }
      }

      if (changed) {
        await db.match.update({
          where: { id: match.id },
          data: { homeTeam, awayTeam },
        });
        resolved.push(`${match.homeTeam} vs ${match.awayTeam} → ${homeTeam} vs ${awayTeam}`);
      } else {
        skipped.push(`${match.homeTeam} vs ${match.awayTeam} (posición sin resolver)`);
      }
    }

    return NextResponse.json({
      success: true,
      deduplicated: toDelete.length,
      resolved,
      skipped,
      message: `${toDelete.length > 0 ? `${toDelete.length} duplicados eliminados. ` : ''}${resolved.length} equipos resueltos. ${skipped.length} pendientes (${skipped.length > 0 ? 'esperan resultados de grupos' : 'todos listos'}).`,
    });
  } catch (err: any) {
    console.error('Knockout generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
