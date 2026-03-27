import pool from '@/lib/supabase';
import { NextResponse } from 'next/server';

const DEFAULT_LIFETIME_LIMIT = 100; // Số tin nhắn tối đa mặc định cho mỗi user

// GET: Lấy 50 tin nhắn cuối cùng của một thread
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

    const sorted = result.rows.reverse();
    return NextResponse.json({ messages: sorted });
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ error: 'Không thể lấy tin nhắn' }, { status: 500 });
  }
}

// POST: Lưu tin nhắn mới (kiểm tra giới hạn tổng số tin của user)
export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const { userId, threadId, role, content } = await req.json();

    if (!userId || !threadId || !role || !content) {
      return NextResponse.json(
        { error: 'userId, threadId, role, content là bắt buộc' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Chỉ giới hạn khi role là 'user'
    if (role === 'user') {
      // 1. Kiểm tra quota hiện tại
      const quotaResult = await client.query(
        `SELECT total_messages, max_limit FROM user_quotas 
         WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      let currentUsage = 0;
      let maxLimit = DEFAULT_LIFETIME_LIMIT;

      if (quotaResult.rows.length > 0) {
        currentUsage = quotaResult.rows[0].total_messages;
        maxLimit = quotaResult.rows[0].max_limit;
      } else {
        // Tự động tạo record quota nếu chưa có
        await client.query(
          `INSERT INTO user_quotas (user_id, total_messages, max_limit) 
           VALUES ($1, 0, $2)`,
          [userId, DEFAULT_LIFETIME_LIMIT]
        );
      }

      if (currentUsage >= maxLimit) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Bạn đã dùng hết gói ${maxLimit} tin nhắn. Hãy liên hệ Cô Minh để nạp thêm nhé! 😅` },
          { status: 403 }
        );
      }

      // 2. Tăng số lượng tin đã dùng
      await client.query(
        `UPDATE user_quotas SET total_messages = total_messages + 1 
         WHERE user_id = $1`,
        [userId]
      );
    }

    // 3. Lưu tin nhắn mới
    const result = await client.query(
      `INSERT INTO messages (user_id, thread_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role, content, created_at`,
      [userId, threadId, role, content]
    );

    // 4. Cập nhật updated_at của thread
    await client.query(
      `UPDATE threads SET updated_at = now() WHERE id = $1`,
      [threadId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ message: result.rows[0] });

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Messages POST error:', err);
    return NextResponse.json({ error: 'Lỗi khi lưu tin nhắn' }, { status: 500 });
  } finally {
    client.release();
  }
}
