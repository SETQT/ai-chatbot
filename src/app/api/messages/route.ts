import pool from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET: Lấy 20 tin nhắn cuối cùng của một thread
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const threadId = searchParams.get('threadId');

    if (!userId || !threadId) {
      return NextResponse.json({ error: 'userId and threadId are required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM messages
       WHERE user_id = $1 AND thread_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId, threadId]
    );

    // Đảo ngược lại để tin nhắn cũ nhất lên trước
    const sorted = result.rows.reverse();

    return NextResponse.json({ messages: sorted });
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ error: 'Không thể lấy tin nhắn' }, { status: 500 });
  }
}

// POST: Lưu tin nhắn mới (user hoặc assistant) gắn với thread
export async function POST(req: Request) {
  try {
    const { userId, threadId, role, content } = await req.json();

    if (!userId || !threadId || !role || !content) {
      return NextResponse.json(
        { error: 'userId, threadId, role, content là bắt buộc' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO messages (user_id, thread_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role, content, created_at`,
      [userId, threadId, role, content]
    );

    // Cập nhật updated_at của thread
    await pool.query(
      `UPDATE threads SET updated_at = now() WHERE id = $1`,
      [threadId]
    );

    return NextResponse.json({ message: result.rows[0] });
  } catch (err: any) {
    console.error('Messages POST error:', err);
    return NextResponse.json({ error: 'Không thể lưu tin nhắn' }, { status: 500 });
  }
}
