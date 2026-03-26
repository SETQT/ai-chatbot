/**
 * OpenAI Client for Responses API
 * Implements raw HTTP requests with streaming and retry logic.
 */
export interface OpenAIResponseOptions {
  model?: string;
  instructions: string;
  input: string | { role: string; content: string }[];
  stream?: boolean;
}

export async function openAIChatRequest(options: OpenAIResponseOptions) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // ✅ Normalize input đúng schema Responses API
  const input =
    typeof options.input === 'string'
      ? options.input
      : options.input.map((m) => ({
        role: m.role,
        content: [
          {
            type: m.role === 'assistant' ? 'output_text' : 'input_text',
            text: m.content || '',
          },
        ],
      }));

  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new Error('Input cannot be empty for OpenAI Responses API');
  }

  const payload = {
    model: options.model || 'gpt-4.1',
    instructions: options.instructions || '',
    input,
    stream: options.stream ?? false,
  };

  const executeRequest = async (retryCount = 0): Promise<Response> => {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          return executeRequest(retryCount + 1);
        }

        const details = await response.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(`OpenAI API Error ${response.status}: ${JSON.stringify(details)}`);
      }

      return response;
    } catch (err) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return executeRequest(retryCount + 1);
      }
      throw err;
    }
  };

  return executeRequest();
}

export async function* streamResponseLines(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();

        try {
          const json = JSON.parse(raw);

          // ✅ ONLY handle text delta
          if (json.type === 'response.output_text.delta') {
            yield json.delta;
          }

          // optional: end signal
          if (json.type === 'response.completed') {
            return;
          }

        } catch (err) {
          // ignore non-json / partial chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}