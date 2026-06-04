import { describe, it, expect, vi, afterEach } from 'vitest';
import { chatJSON, responsesWebSearch, OpenAIError } from '@/lib/advisor/openai';

afterEach(() => vi.unstubAllGlobals());

const args = (over = {}) => ({
  apiKey: 'sk-test',
  model: 'gpt-5',
  system: 'sys',
  user: 'usr',
  schema: { type: 'object', additionalProperties: false, required: ['a'], properties: { a: { type: 'number' } } },
  schemaName: 'x',
  signal: new AbortController().signal,
  ...over,
});

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => '' }) as Response;

describe('chatJSON', () => {
  it('parses the JSON content from a successful completion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ choices: [{ message: { content: '{"a":1}' } }] })));
    expect(await chatJSON<{ a: number }>(args())).toEqual({ a: 1 });
  });

  it('throws on a 4xx without retrying', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 400, text: async () => 'bad request' }) as Response);
    vi.stubGlobal('fetch', f);
    await expect(chatJSON(args())).rejects.toBeInstanceOf(OpenAIError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    let n = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        n += 1;
        return n === 1
          ? ({ ok: false, status: 429, text: async () => 'rate' }) as Response
          : ok({ choices: [{ message: { content: '{"a":2}' } }] });
      }),
    );
    expect(await chatJSON<{ a: number }>(args())).toEqual({ a: 2 });
    expect(n).toBe(2);
  });
});

describe('responsesWebSearch', () => {
  it('extracts text + url citations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: 'The phone is great.',
                  annotations: [{ type: 'url_citation', url: 'https://x.com/a', title: 'Review A' }],
                },
              ],
            },
          ],
        }),
      ),
    );
    const r = await responsesWebSearch('sk', 'gpt-5', 'prompt', new AbortController().signal);
    expect(r?.text).toContain('great');
    expect(r?.citations[0]).toEqual({ title: 'Review A', url: 'https://x.com/a' });
  });

  it('returns null on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    expect(await responsesWebSearch('sk', 'gpt-5', 'p', new AbortController().signal)).toBeNull();
  });
});
