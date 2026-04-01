import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `Bạn là "Kiều" — trợ lý AI chuyên tra cứu giá xăng, tính cách "nhây", hay dùng từ ngữ Gen Z nhưng làm việc rất chuẩn chỉ.

## Flow bắt buộc:
1. Khi user hỏi giá: Gọi tool 'get_fuel_prices'.
2. Hiển thị bảng giá dưới dạng Markdown Table cho user xem.
3. Luôn hỏi: "Kiều gửi báo cáo này lên Discord cho đại ca luôn nhé? 😉"
4. Nếu user đồng ý: Gọi tool 'send_discord_report'.

## Rules:
- KHÔNG tự chế giá.
- Nếu lấy giá thất bại, dùng giá fallback và báo rõ là "Giá cũ tham khảo".
- Trả lời bằng tiếng Việt.`;

// ===== UTILS: Cào dữ liệu ổn định hơn =====
function safeExtractText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getFuelPrices() {
  try {
    const res = await fetch('https://www.pvoil.com.vn/tin-gia-xang-dau', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // Cache 1 tiếng để tránh bị chặn IP
    });

    const html = await res.text();
    const prices: { name: string; price: string }[] = [];

    // Tách các dòng <tr>
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rows) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => safeExtractText(m[1]));

      // Structure: [STT, Tên hàng, Giá, Chênh lệch]
      if (cells.length >= 3) {
        const name = cells[1];
        const price = cells[2].replace(/\s*đ\s*$/i, '').trim();

        if (/ron|diesel|dầu|e5|e10/i.test(name) && /[\d.,]+/.test(price)) {
          prices.push({ name, price });
        }
      }
    }

    if (prices.length === 0) {
      return { error: 'Không lấy được dữ liệu giá từ PVOIL. Vui lòng thử lại sau.' };
    }

    return prices;
  } catch (err) {
    return { error: 'Lỗi kết nối tới PVOIL. Vui lòng thử lại sau.' };
  }
}

// ===== MAIN HANDLER =====
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        get_fuel_prices: tool({
          description: 'Lấy danh sách giá xăng dầu mới nhất từ PVOIL',
          inputSchema: z.object({
            reason: z.string().describe('Lý do tra cứu (vd: "User yêu cầu", "Cập nhật định kỳ")'),
          }),
          execute: async () => {
            const data = await getFuelPrices();
            return data;
          },
        }),

        send_discord_report: tool({
          description: 'Gửi bảng báo giá đã format đẹp mắt lên Discord',
          inputSchema: z.object({
            content: z.string().describe('Nội dung báo cáo định dạng Markdown'),
          }),
          execute: async ({ content }) => {
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (!webhookUrl) return { success: false, error: 'Chưa cấu hình Webhook' };

            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: "Kiều Xăng Dầu",
                avatar_url: "https://i.imgur.com/8n7Y7f7.png", // Thêm avatar cho nhây
                content: `🚀 **BÁO CÁO GIÁ XĂNG DẦU HÔM NAY** 🚀\n${content}\n_Chúc đại ca một ngày làm việc hiệu quả!_`
              }),
            });

            return { success: response.ok };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}