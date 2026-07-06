import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { unstable_cache } from 'next/cache';

const getCachedStandings = unstable_cache(
  async () => {
    return await dbClient.getStandings();
  },
  ['standings-cache-key'],
  { tags: ['standings'] }
);

export async function GET(request: NextRequest) {
  try {
    const standings = await getCachedStandings();
    return NextResponse.json({ standings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

