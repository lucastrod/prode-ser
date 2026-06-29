import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const users = await db.user.findMany({
      where: { name: { contains: 'Lucas Castro', mode: 'insensitive' } }
    });
    
    if (!users.length) return NextResponse.json({ error: 'Usuario Lucas Castro no encontrado' });
    const lucas = users[0];

    const matches = await db.match.findMany({
      where: {
        OR: [
          { homeTeam: { contains: 'Alemania', mode: 'insensitive' } },
          { awayTeam: { contains: 'Alemania', mode: 'insensitive' } },
          { homeTeam: { contains: 'Germany', mode: 'insensitive' } },
          { awayTeam: { contains: 'Germany', mode: 'insensitive' } },
        ]
      },
      orderBy: { matchDate: 'desc' }
    });

    if (!matches.length) return NextResponse.json({ error: 'No hay partidos de Alemania' });
    
    // Seleccionamos el más reciente (seguramente el de Octavos de Final contra Dinamarca)
    const match = matches[0]; 

    // Alemania 2 - 1 Otro. 
    const isGermanyHome = match.homeTeam.toLowerCase().includes('alemania') || match.homeTeam.toLowerCase().includes('germany');
    const homeScore = isGermanyHome ? 2 : 1;
    const awayScore = isGermanyHome ? 1 : 2;

    const pred = await db.prediction.upsert({
      where: {
        userId_matchId: { userId: lucas.id, matchId: match.id },
      },
      create: {
        userId: lucas.id,
        matchId: match.id,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      },
      update: {
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        createdAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pronóstico de Lucas actualizado a 2-1 a favor de Alemania',
      match: `${match.homeTeam} vs ${match.awayTeam}`,
      prediction: `${pred.predictedHomeScore} - ${pred.predictedAwayScore}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
