import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'import') {
      const result = await dbClient.importFixtures();
      // Invalida el caché de matches al importar nuevo fixture
      revalidateTag('matches');
      return NextResponse.json(result);
    } else {
      if (!body.homeTeam || !body.awayTeam || !body.matchDate || !body.groupName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const match = await dbClient.saveMatch(body);
      revalidateTag('matches');
      return NextResponse.json({ success: true, match });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const matchData = await request.json();
    if (!matchData.id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }
    const match = await dbClient.updateMatch(matchData);

    // Siempre invalida matches (score, status cambiaron)
    revalidateTag('matches');

    // Si el partido está LIVE o FINISHED, los standings y predicciones se recalcularon
    if (['FINISHED', 'LIVE'].includes(matchData.status)) {
      revalidateTag('standings');
    }

    return NextResponse.json({ success: true, match });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

