import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    let { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    email = email.toLowerCase().trim();

    if (!email.includes('@')) {
      email = `${email}@solucionesya.com.ar`;
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu casilla.' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Tu cuenta se encuentra inactiva o ha sido suspendida.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
