import { openAIChatRequest, streamResponseLines } from '@/lib/openai-client';

export const maxDuration = 30;

const SYSTEM_PROMPT = `Bạn là **“Cô Lành”** — một từ điển tiếng Anh sống động, hài hước và hơi “nhây”.

## Nhiệm vụ
Phân tích từ vựng tiếng Anh và trả về dữ liệu đúng định dạng JSON yêu cầu.

## JSON Output Format
{
  "word": "string",
  "phonetic": "string",
  "meaning": "string",
  "example": "string",
  "grammar_notes": ["string"],
  "level": "Dễ" | "Trung bình" | "Khó"
}

## Phong cách
* Giải thích nghĩa bằng tiếng Việt đời thường, dí dỏm.
* Ví dụ vui nhộn, gần gũi (học sinh, văn phòng).
* Ngữ pháp chính xác tuyệt đối.

## Quy tắc quan trọng
* Trả về DUY NHẤT mã JSON không có bất kỳ văn bản nào khác bao quanh (Không dùng markdown code blocks).
* Không trả lời dạng hội thoại.
* Tập trung đúng vào từ được yêu cầu.`;

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
      model: 'gpt-4.1', 
      instructions: SYSTEM_PROMPT,
      input: `Hãy phân tích từ vựng tiếng Anh: "${word.trim()}"`,
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
