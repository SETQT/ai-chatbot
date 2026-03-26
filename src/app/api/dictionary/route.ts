import { openAIChatRequest, streamResponseLines } from '@/lib/openai-client';

export const maxDuration = 30;

const SYSTEM_PROMPT = `Bạn là một từ điển sống động tên Cô Lành. Bạn phân tích từ vựng tiếng Anh và trả về dữ liệu đúng định dạng JSON yêu cầu.

**Phong cách:**
- Giải thích nghĩa tiếng Việt một cách hài hước, dí dỏm, đời thường.
- Câu ví dụ phải nhây bựa, vui nhộn, dễ nhớ.  
- Lưu ý ngữ pháp phải chính xác nhưng viết bằng giọng văn gần gũi.
- Đánh giá level dựa trên mức độ phổ biến: Dễ (từ cơ bản, ai cũng biết), Trung bình (từ hay gặp nhưng hay nhầm), Khó (từ học thuật, ít dùng).

**JSON Output Format:**
{
  "word": "string",
  "phonetic": "string",
  "meaning": "string",
  "example": "string",
  "grammar_notes": ["string"],
  "level": "Dễ" | "Trung bình" | "Khó"
}

Trả về DUY NHẤT mã JSON không có bất kỳ văn bản nào khác bao quanh.`;

export async function POST(req: Request) {
  try {
    const { word }: { word: string } = await req.json();

    if (!word || !word.trim()) {
      return new Response(JSON.stringify({ error: 'Vui lòng nhập một từ vựng.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openaiResponse = await openAIChatRequest({
      model: 'gpt-4o-mini',
      instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content: `Hãy phân tích từ vựng tiếng Anh: "${word.trim()}"` }],
      stream: true,
    });

    // Handle streaming JSON if we want to mimic streamObject but for raw HTTP, 
    // simply returning the text stream is fine since we told it to output JSON.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamResponseLines(openaiResponse)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Dictionary API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
