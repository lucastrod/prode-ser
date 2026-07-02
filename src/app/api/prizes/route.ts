import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  try {
    const prizes = await dbClient.getPrizes();
    return NextResponse.json({ prizes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const prizeData = await request.json();
    if (prizeData.position === undefined || !prizeData.title || !prizeData.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const prize = await dbClient.savePrize(prizeData);
    return NextResponse.json({ success: true, prize });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get('position');

  if (!position) {
    return NextResponse.json({ error: 'Position is required' }, { status: 400 });
  }

  try {
    await dbClient.deletePrize(Number(position));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}