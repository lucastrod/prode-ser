import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { cacheTag } from 'next/cache';

async function getMatchesData() {
  'use cache';
  cacheTag('matches');
  return dbClient.getMatches();
}

export async function GET(request: NextRequest) {
  try {
    const matches = await getMatchesData();
    return NextResponse.json({ matches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

