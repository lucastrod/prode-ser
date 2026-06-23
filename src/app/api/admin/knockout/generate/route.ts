import { NextRequest, NextResponse } from 'next/server';
import { Stage, MatchStatus } from '@prisma/client';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { parseMatchDateTime } from '@/lib/sync-matches';

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

// Map fixture JSON round strings → Prisma Stage enum
const ROUND_TO_STAGE: Record<string, Stage> = {
  'Round of 32':        Stage.ROUND_32,
  'Round of 16':        Stage.ROUND_16,
  'Quarter-final':      Stage.QUARTER,
  'Semi-final':         Stage.SEMI,
  'Match for third place': Stage.THIRD_PLACE,
  'Final':              Stage.FINAL,
};

// Map fixture JSON round strings → human-readable group name
const ROUND_TO_GROUP: Record<string, string> = {
  'Round of 32':        'Round of 32',
  'Round of 16':        'Round of 16',
  'Quarter-final':      'Cuartos de Final',
  'Semi-final':         'Semifinales',
  'Match for third place': '3er Puesto',
  'Final':              'Gran Final',
};

// Fallback qualifiers when starting directly from the knockout stage (no group standings in DB)
const FALLBACK_QUALIFIERS: Record<string, string> = {
  "1A": "México", "2A": "República Checa",
  "1B": "Suiza", "2B": "Canadá",
  "1C": "Brasil", "2C": "Marruecos",
  "1D": "Estados Unidos", "2D": "Australia",
  "1E": "Alemania", "2E": "Ecuador",
  "1F": "Países Bajos", "2F": "Japón",
  "1G": "Bélgica", "2G": "Irán",
  "1H": "España", "2H": "Uruguay",
  "1I": "Francia", "2I": "Senegal",
  "1J": "Argentina", "2J": "Austria",
  "1K": "Portugal", "2K": "Colombia",
  "1L": "Inglaterra", "2L": "Croacia",
  "3A/B/C/D/F": "Corea del Sur",
  "3C/D/F/G/H": "Túnez",
  "3C/E/F/H/I": "Ghana",
  "3E/H/I/J/K": "Cabo Verde",
  "3B/E/F/I/J": "Catar",
  "3A/E/H/I/J": "Sudáfrica",
  "3E/F/G/I/J": "Egipto",
  "3D/E/I/J/L": "Panamá"
};

type SlotResult = {
  team: string | null;
  label: string;
};

function resolveSlot(
  placeholder: string,
  groupStandings: { groupName: string; teams: { team: string }[] }[]
): SlotResult {
  const getTeam = (pos: number, groupLetter: string) => {
    const full = `Grupo ${groupLetter}`;
    const group = groupStandings.find((g) => g.groupName === full);
    return group?.teams[pos]?.team ?? null;
  };

  const simpleMatch = placeholder.match(/^([12])([A-L])$/);
  if (simpleMatch) {
    const pos = parseInt(simpleMatch[1]) - 1;
    const letter = simpleMatch[2];
    const team = getTeam(pos, letter);
    return {
      team,
      label: `${pos === 0 ? '1°' : '2°'} Grupo ${letter}`,
    };
  }

  const thirdMatch = placeholder.match(/^3([A-L\/]+)$/);
  if (thirdMatch) {
    const groups = thirdMatch[1].split('/');
    return {
      team: null,
      label: `Mejor 3° ${groups.join('/')}`,
    };
  }

  return { team: null, label: placeholder };
}

export async function POST(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Get group standings
    const groupMatches = await db.match.findMany({
      where: { stage: Stage.GROUP },
      orderBy: { matchDate: 'asc' },
    });
    const groupStandings = buildGroupStandings(groupMatches);

    const knockoutRounds = Object.keys(ROUND_TO_STAGE);
    const knockoutFixtures = (data.matches || []).filter(
      (m: any) => knockoutRounds.includes(m.round)
    );

    const created: string[] = [];
    const skipped: string[] = [];

    for (const fixture of knockoutFixtures) {
      const stage = ROUND_TO_STAGE[fixture.round];
      const groupName = ROUND_TO_GROUP[fixture.round];
      const matchDate = parseMatchDateTime(fixture.date, fixture.time);
      const fixtureNum = fixture.num ? String(fixture.num) : null;

      let homeTeam: string;
      let awayTeam: string;

      if (fixture.round === 'Round of 32') {
        const slot1 = resolveSlot(fixture.team1, groupStandings);
        const slot2 = resolveSlot(fixture.team2, groupStandings);
        homeTeam = slot1.team ?? FALLBACK_QUALIFIERS[fixture.team1] ?? `[${slot1.label}]`;
        awayTeam = slot2.team ?? FALLBACK_QUALIFIERS[fixture.team2] ?? `[${slot2.label}]`;
      } else {
        homeTeam = fixture.team1;
        awayTeam = fixture.team2;
      }

      const externalId = fixtureNum
        ? (fixture.round === 'Round of 32' ? `r32_${fixtureNum}` : fixtureNum)
        : null;

      if (externalId) {
        const existing = await db.match.findUnique({ where: { externalMatchId: externalId } });
        if (existing) {
          skipped.push(`[${fixture.round}] ${homeTeam} vs ${awayTeam}`);
          continue;
        }
      }

      await db.match.create({
        data: {
          ...(externalId ? { externalMatchId: externalId } : {}),
          homeTeam,
          awayTeam,
          matchDate,
          groupName,
          stage,
          status: MatchStatus.SCHEDULED,
        },
      });

      created.push(`[${fixture.round}] ${homeTeam} vs ${awayTeam}`);
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `${created.length} partidos creados, ${skipped.length} ya existían.`,
    });
  } catch (err: any) {
    console.error('Knockout generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
