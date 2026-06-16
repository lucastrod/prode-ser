import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  try {
    const metrics = await dbClient.getAdminMetrics();
    return NextResponse.json({ metrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
