import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ profile: null }, { status: 500 });
  }
}
