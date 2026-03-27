import pool from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET: Lấy 20 tin nhắn cuối cùng của user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Đảo ngược lại để tin nhắn cũ nhất lên trước
    const sorted = result.rows.reverse();

    return NextResponse.json({ messages: sorted });
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ error: 'Không thể lấy tin nhắn' }, { status: 500 });
  }
}

// POST: Lưu tin nhắn mới (user hoặc assistant)
export async function POST(req: Request) {
  try {
    const { userId, role, content } = await req.json();

    if (!userId || !role || !content) {
      return NextResponse.json(
        { error: 'userId, role, content là bắt buộc' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO messages (user_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING id, role, content, created_at`,
      [userId, role, content]
    );

    return NextResponse.json({ message: result.rows[0] });
  } catch (err: any) {
    console.error('Messages POST error:', err);
    return NextResponse.json({ error: 'Không thể lưu tin nhắn' }, { status: 500 });
  }
}
