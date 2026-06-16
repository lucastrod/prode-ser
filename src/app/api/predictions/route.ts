import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const predictions = await dbClient.getPredictions(userId);
    return NextResponse.json({ predictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, matchId, predictedHomeScore, predictedAwayScore } = await request.json();
    
    if (!userId || matchId === undefined || predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prediction = await dbClient.savePrediction(
      userId,
      Number(matchId),
      Number(predictedHomeScore),
      Number(predictedAwayScore)
    );

    return NextResponse.json({ success: true, prediction });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
export const dynamic = 'force-dynamic';
