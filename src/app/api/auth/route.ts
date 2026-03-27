import pool from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username và password là bắt buộc' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT id, username, display_name FROM users WHERE username = $1 AND password = $2 LIMIT 1',
      [username, password]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sai tên đăng nhập hoặc mật khẩu' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (err: any) {
    console.error('Auth error:', err);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
