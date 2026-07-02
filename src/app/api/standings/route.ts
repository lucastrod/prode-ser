import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { cacheTag } from 'next/cache';

async function getStandingsData() {
  'use cache';
  cacheTag('standings');
  return dbClient.getStandings();
}

export async function GET(request: NextRequest) {
  try {
    const standings = await getStandingsData();
    return NextResponse.json({ standings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

