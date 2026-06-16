import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen (JPEG, PNG, GIF o WEBP).' }, { status: 400 });
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no debe superar los 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 Data URL to allow storage in database without write access to local filesystem (e.g. on Vercel)
    const base64Data = buffer.toString('base64');
    const avatarUrl = `data:${file.type};base64,${base64Data}`;

    // Update User record in database
    await db.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Error interno del servidor al subir la imagen.' }, { status: 500 });
  }
}
