import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const maxDuration = 30;

const vocabularySchema = z.object({
  word: z.string().describe('Từ tiếng Anh'),
  phonetic: z.string().describe('Phiên âm IPA'),
  meaning: z.string().describe('Nghĩa tiếng Việt - giải thích hài hước kiểu Cô Lành'),
  example: z.string().describe('Câu ví dụ nhây bựa, hài hước'),
  grammar_notes: z.array(z.string()).describe('Danh sách các lưu ý ngữ pháp liên quan'),
  level: z.enum(['Dễ', 'Trung bình', 'Khó']).describe('Cấp độ của từ vựng'),
});

const SYSTEM_PROMPT = `Bạn là một từ điển sống động tên Cô Lành. Bạn phân tích từ vựng tiếng Anh và trả về dữ liệu đúng định dạng JSON yêu cầu.

**Phong cách:**
- Giải thích nghĩa tiếng Việt một cách hài hước, dí dỏm, đời thường.
- Câu ví dụ phải nhây bựa, vui nhộn, dễ nhớ.  
- Lưu ý ngữ pháp phải chính xác nhưng viết bằng giọng văn gần gũi.
- Đánh giá level dựa trên mức độ phổ biến: Dễ (từ cơ bản, ai cũng biết), Trung bình (từ hay gặp nhưng hay nhầm), Khó (từ học thuật, ít dùng).`;

export async function POST(req: Request) {
  const { word }: { word: string } = await req.json();

  if (!word || !word.trim()) {
    return new Response(JSON.stringify({ error: 'Vui lòng nhập một từ vựng.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = streamObject({
    model: openai('gpt-4o-mini'),
    schema: vocabularySchema,
    system: SYSTEM_PROMPT,
    prompt: `Hãy phân tích từ vựng tiếng Anh: "${word.trim()}"`,
  });

  return result.toTextStreamResponse();
}
