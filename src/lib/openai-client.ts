/**
 * OpenAI Client for Responses API
 * Implements raw HTTP requests with streaming and retry logic.
 */
export interface OpenAIResponseOptions {
  model?: string;
  instructions: string;
  input: string | { role: string; content: string }[];
  stream?: boolean;
  response_format?: any;
  tools?: any[];
}

export async function openAIChatRequest(options: OpenAIResponseOptions) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // ✅ Normalize input đúng schema Responses API
  const input =
    typeof options.input === 'string'
      ? [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: options.input,
              },
            ],
          },
        ]
      : options.input.map((m: any) => {
          // Pass through items that are already in API format (function_call, function_call_output, etc.)
          if (m.type) return m;
          // Only normalize standard {role, content} items where content is a string
          if (typeof m.content === 'string') {
            return {
              role: m.role,
              content: [
                {
                  type: m.role === 'assistant' ? 'output_text' : 'input_text',
                  text: m.content || '',
                },
              ],
            };
          }
          // If content is already an array, pass through as-is
          return m;
        });

  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new Error('Input cannot be empty for OpenAI Responses API');
  }

  const payload: any = {
    model: options.model || 'gpt-4.1',
    instructions: options.instructions || '',
    input,
    stream: options.stream ?? false,
  };

  if (options.response_format) {
    payload.response_format = options.response_format;
  }

  if (options.tools && options.tools.length > 0) {
    payload.tools = options.tools;
  }

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

/**
 * Parse SSE stream events including function_call and text delta.
 * Yields typed events for the caller to handle tool calls or text.
 */
export type StreamEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'function_call'; callId: string; name: string; arguments: string }
  | { type: 'done' };

export async function* parseStreamEvents(response: Response): AsyncGenerator<StreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  // Track partial function call data
  const pendingCalls: Record<string, { name: string; args: string }> = {};

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

          // Text delta
          if (json.type === 'response.output_text.delta') {
            yield { type: 'text_delta', delta: json.delta };
          }

          // Function call arguments streaming
          if (json.type === 'response.function_call_arguments.delta') {
            const itemId = json.item_id;
            if (!pendingCalls[itemId]) {
              pendingCalls[itemId] = { name: '', args: '' };
            }
            pendingCalls[itemId].args += json.delta;
          }

          // Function call arguments done
          if (json.type === 'response.function_call_arguments.done') {
            const itemId = json.item_id;
            if (pendingCalls[itemId]) {
              pendingCalls[itemId].args = json.arguments;
            }
          }

          // Output item done — check if it's a function_call
          if (json.type === 'response.output_item.done' && json.item?.type === 'function_call') {
            const item = json.item;
            yield {
              type: 'function_call',
              callId: item.call_id,
              name: item.name,
              arguments: item.arguments,
            };
          }

          if (json.type === 'response.completed') {
            yield { type: 'done' };
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