import pool from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET: Lấy danh sách threads của user (mới nhất trước)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM threads
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    );

    return NextResponse.json({ threads: result.rows });
  } catch (err: any) {
    console.error('Threads GET error:', err);
    return NextResponse.json({ error: 'Không thể lấy danh sách threads' }, { status: 500 });
  }
}

// POST: Tạo thread mới
export async function POST(req: Request) {
  try {
    const { userId, title } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO threads (user_id, title)
       VALUES ($1, $2)
       RETURNING id, title, created_at, updated_at`,
      [userId, title || 'Cuộc trò chuyện mới']
    );

    return NextResponse.json({ thread: result.rows[0] });
  } catch (err: any) {
    console.error('Threads POST error:', err);
    return NextResponse.json({ error: 'Không thể tạo thread' }, { status: 500 });
  }
}
