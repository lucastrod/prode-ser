import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { MatchStatus, Stage } from '@prisma/client';
import { TEAM_TRANSLATIONS, parseMatchDateTime } from '@/lib/sync-matches';

export async function POST(request: NextRequest) {
  try {
    // 1. Delete all GROUP stage predictions first (cascade)
    const groupMatches = await db.match.findMany({
      where: { stage: Stage.GROUP },
      select: { id: true },
    });
    const groupMatchIds = groupMatches.map((m) => m.id);

    if (groupMatchIds.length > 0) {
      await db.prediction.deleteMany({
        where: { matchId: { in: groupMatchIds } },
      });
      await db.match.deleteMany({
        where: { stage: Stage.GROUP },
      });
    }

    // 2. Read fixture JSON
    const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // 3. Get all group stage matches
    const rawGroupMatches = (data.matches || []).filter((m: any) => m.group);

    // 4. Group by group name and sort chronologically (ALL 6 per group)
    const matchesByGroup: Record<string, any[]> = {};
    for (const match of rawGroupMatches) {
      const gName = match.group.replace('Group', 'Grupo');
      if (!matchesByGroup[gName]) matchesByGroup[gName] = [];
      matchesByGroup[gName].push(match);
    }

    const allGroupMatches: any[] = [];
    for (const gName in matchesByGroup) {
      const sorted = matchesByGroup[gName].sort((a, b) => {
        return parseMatchDateTime(a.date, a.time).getTime() - parseMatchDateTime(b.date, b.time).getTime();
      });
      allGroupMatches.push(...sorted); // All 6 matches per group
    }

    // 5. Insert all group matches
    const matchesData = allGroupMatches.map((fixture: any, idx: number) => ({
      externalMatchId: `openfootball_2026_group_${idx + 1}`,
      homeTeam: TEAM_TRANSLATIONS[fixture.team1] || fixture.team1,
      awayTeam: TEAM_TRANSLATIONS[fixture.team2] || fixture.team2,
      matchDate: parseMatchDateTime(fixture.date, fixture.time),
      groupName: fixture.group.replace('Group', 'Grupo'),
      stage: Stage.GROUP,
      status: MatchStatus.SCHEDULED,
    }));

    const created = await db.match.createMany({
      data: matchesData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      deleted: groupMatchIds.length,
      created: created.count,
      message: `Eliminados ${groupMatchIds.length} partidos de grupo, importados ${created.count} (6 por grupo).`,
    });
  } catch (err: any) {
    console.error('Reimport group matches error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
