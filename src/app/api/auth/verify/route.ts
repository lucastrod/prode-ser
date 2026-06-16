import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_missing', req.url));
    }

    // Find the user with this verification token
    const user = await db.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=token_invalid', req.url));
    }

    // Activate user and mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        active: true,
        verificationToken: null,
      },
    });

    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', req.url));
  }
}
