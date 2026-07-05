import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const user = await dbClient.getUserByResetToken(token);

    if (!user) {
      return NextResponse.json({ error: 'El enlace de recuperación es inválido o ha expirado.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await dbClient.resetUserPassword(user.id, passwordHash);

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente.' });

  } catch (error: any) {
    console.error('Error en reset-password:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
