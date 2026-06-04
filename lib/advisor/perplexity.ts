import type { WebFinding } from './openai';

/**
 * Optional Perplexity (Sonar) search — BYO key, off by default. Returns null on any failure
 * so it's purely additive when configured.
 */
export async function perplexitySearch(
  apiKey: string,
  query: string,
  signal: AbortSignal,
): Promise<WebFinding | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Answer concisely with factual, sourced product information.' },
          { role: 'user', content: query },
        ],
      }),
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    const citations = (data.citations ?? []).map((url) => ({ title: url, url }));
    return text ? { text, citations } : null;
  } catch {
    return null;
  }
}
