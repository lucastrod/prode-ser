import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const predictions = await dbClient.getPredictionsByUser(userId);
    const now = new Date();

    // Filter predictions to only include locked/started matches
    const filteredPredictions = predictions.filter((p: any) => {
      if (!p.match) return false;
      const matchDate = new Date(p.match.matchDate);
      const isLocked = now >= new Date(matchDate.getTime() - 15 * 60000) || p.match.status === 'LIVE' || p.match.status === 'FINISHED';
      return isLocked;
    });

    return NextResponse.json({ predictions: filteredPredictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
