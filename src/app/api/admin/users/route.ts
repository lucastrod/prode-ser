import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db-client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const users = await dbClient.getUsers();
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let { name, email, role, password } = await request.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    email = email.toLowerCase().trim();

    if (!email.includes('@')) {
      email = `${email}@solucionesya.com.ar`;
    }

    let userId: string = randomUUID();

    // Try to create user in Supabase Auth using Admin Client
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (error) throw error;
      if (data?.user) {
        userId = data.user.id;
      }
    } catch (supabaseErr) {
      console.warn('Supabase admin API unavailable, creating user locally/mock only:', supabaseErr);
    }

    const user = await dbClient.saveUser({
      id: userId,
      name,
      email,
      role: role || 'USER',
      active: true,
      password,
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userData = await request.json();
    if (!userData.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userData.email) {
      userData.email = userData.email.toLowerCase().trim();
      if (!userData.email.includes('@')) {
        userData.email = `${userData.email}@solucionesya.com.ar`;
      }
    }

    // If a password reset is requested, try to apply it in Supabase Auth
    if (userData.password) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userData.id, {
          password: userData.password,
        });
        if (error) throw error;
      } catch (authErr) {
        console.warn('Could not update password in Supabase Auth, local update only:', authErr);
      }
    }

    const user = await dbClient.updateUser(userData);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Try to delete user in Supabase Auth using Admin Client
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
    } catch (supabaseErr) {
      console.warn('Supabase admin API unavailable, deleting user locally only:', supabaseErr);
    }

    await dbClient.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
