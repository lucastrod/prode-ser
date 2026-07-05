import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const user = await dbClient.getUserByEmail(email);

    if (!user) {
      // Devolver error genérico o específico (al ser un grupo de amigos, puede ser específico)
      return NextResponse.json({ error: 'No se encontró ningún usuario con ese correo.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Re-utilizamos resetUserPassword, le pasamos el ID.
    // Como simplificamos el flujo, directamente lo actualiza.
    await dbClient.resetUserPassword(user.id, passwordHash);

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente.' });

  } catch (error: any) {
    console.error('Error en forgot-password (direct):', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
