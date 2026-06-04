/** Minimal OpenAI Chat Completions client with strict structured outputs + retry/backoff. */

interface ChatJSONArgs {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  signal: AbortSignal;
  maxTokens?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OpenAIError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export async function chatJSON<T>({
  apiKey,
  model,
  system,
  user,
  schema,
  schemaName,
  signal,
  maxTokens = 4000,
}: ChatJSONArgs): Promise<T> {
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_completion_tokens: maxTokens,
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal,
      });

      if (res.status === 429 || res.status >= 500) {
        lastErr = new OpenAIError(`OpenAI ${res.status}`, res.status);
        await sleep(2 ** attempt * 600 + Math.random() * 300); // exp backoff + jitter
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new OpenAIError(`OpenAI ${res.status}: ${text.slice(0, 200)}`, res.status);
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new OpenAIError('Empty completion');
      return JSON.parse(content) as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof OpenAIError && e.status && e.status < 500 && e.status !== 429) throw e;
      if (signal.aborted) throw e;
      if (attempt === 3) break;
      await sleep(2 ** attempt * 600);
    }
  }
  throw lastErr instanceof Error ? lastErr : new OpenAIError('OpenAI request failed');
}

export interface WebFinding {
  text: string;
  citations: { title: string; url: string }[];
}

/**
 * Real web search via OpenAI's Responses API (`web_search_preview` tool). OpenAI runs the
 * search server-side and returns an answer with url citations. Returns null on any failure
 * so callers can fall back gracefully (older accounts / unsupported models).
 */
export async function responsesWebSearch(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<WebFinding | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: prompt, tools: [{ type: 'web_search_preview' }], tool_choice: 'auto' }),
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      output_text?: string;
      output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[] }[];
    };
    let text = '';
    const citations: { title: string; url: string }[] = [];
    for (const o of data.output ?? []) {
      if (o.type !== 'message') continue;
      for (const c of o.content ?? []) {
        if (c.type === 'output_text' && c.text) {
          text += c.text;
          for (const a of c.annotations ?? []) {
            if (a.type === 'url_citation' && a.url) citations.push({ title: a.title || a.url, url: a.url });
          }
        }
      }
    }
    if (!text && data.output_text) text = data.output_text;
    return text ? { text, citations } : null;
  } catch {
    return null;
  }
}
