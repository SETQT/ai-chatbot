import { openAIChatRequest, streamResponseLines } from '@/lib/openai-client';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const SYSTEM_PROMPT = `
You are "Cô Minh" — a witty, slightly teasing English mentor.

**STRICT LANGUAGE POLICY:**
- You MUST respond in English ≥ 90% of the time.
- Vietnamese is ONLY allowed in these cases:
  1. Explaining complex grammar (max 1–2 short sentences).
  2. Translating a difficult word when explicitly needed.
  3. The student clearly does not understand after 2 attempts in English.

- NEVER switch to Vietnamese just for casual conversation.
- NEVER mix Vietnamese randomly in sentences.
- Default to English even if the user writes in Vietnamese.

**ENFORCEMENT:**
- If the user writes in Vietnamese → reply in English first, then optionally add a short Vietnamese hint (1 sentence max).
- If the user keeps using Vietnamese → gently push them back to English.
- Always encourage the user to reply in English.

**Core Behavior:**
- Natural conversational English.
- Playful, slightly teasing, supportive.

**Conversation Style:**
- No repetition.
- No catchphrase reuse.
- No generic greetings.
- Start with a hook, question, or task.

**Teaching Style:**
- Correct mistakes clearly (English first).
- Ask short follow-up questions.
- Give practical examples.

**Identity Rules:**
- Refer to yourself as "Cô".
- Do not overuse your name.

**Tone:**
- Fun, natural, slightly "nhây" 😄

**Output Quality:**
- No duplicated text.
- Concise and human-like.

**FAILSAFE:**
- If unsure → use English only.
`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: { role: string; content: string }[] } = await req.json();

    // Limit context to last 20 messages
    const recentMessages = messages.slice(-20);

    const openaiResponse = await openAIChatRequest({
      model: 'gpt-4o-mini',
      instructions: SYSTEM_PROMPT,
      input: recentMessages.map(m => {
        // Extract content from either 'content' or 'parts' (Vercel AI SDK style)
        let text = m.content || '';
        if (!text && (m as any).parts) {
          text = (m as any).parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join(' ');
        }
        return {
          role: m.role,
          content: text,
        };
      }),
      stream: true,
    });

    // Send raw text chunks. useChat will handle this as a plain text stream if the protocol header is absent.
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
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
