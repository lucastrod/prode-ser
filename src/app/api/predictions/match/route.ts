import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchIdStr = searchParams.get('matchId');

    if (!matchIdStr) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    const matchId = Number(matchIdStr);
    const match = await dbClient.getMatch(matchId);

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const matchDate = new Date(match.matchDate);
    const now = new Date();
    // 15 mins before kickoff or live or finished
    const isLocked = now >= new Date(matchDate.getTime() - 15 * 60000) || match.status === 'LIVE' || match.status === 'FINISHED';

    if (!isLocked) {
      return NextResponse.json({ error: 'Este partido aún no ha iniciado. No puedes ver los pronósticos de otros.' }, { status: 403 });
    }

    const predictions = await dbClient.getPredictionsByMatch(matchId);
    return NextResponse.json({ predictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
