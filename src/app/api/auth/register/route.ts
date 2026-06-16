import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    email = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await dbClient.getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const userId = crypto.randomUUID();

    // Create user in DB (auto-verified, no email confirmation needed)
    await dbClient.registerUser({
      id: userId,
      name: name.trim(),
      email,
      passwordHash,
      verificationToken,
    });

    return NextResponse.json({
      success: true,
      message: '¡Registro exitoso! Ya podés iniciar sesión con tu cuenta.'
    });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Error interno al registrar el usuario.' }, { status: 500 });
  }
}
