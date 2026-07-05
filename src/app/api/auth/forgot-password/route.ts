import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const result = await dbClient.generatePasswordResetToken(email);

    // Si el usuario existe, se generó el token y procedemos a enviar el email
    if (result) {
      await sendPasswordResetEmail(email, result.user.name, result.token);
    }

    // Siempre devolvemos éxito para evitar enumeración de emails
    return NextResponse.json({ success: true, message: 'Si el correo está registrado, recibirás un enlace.' });

  } catch (error: any) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
