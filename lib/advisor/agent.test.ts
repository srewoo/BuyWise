import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAgentic } from '@/lib/advisor/agent';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());

const settings = { ...DEFAULT_SETTINGS, openaiKey: 'sk-test', perplexityKey: '' };
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const chatContent = (obj: unknown) => json({ choices: [{ message: { content: JSON.stringify(obj) } }] });

function route(responsesImpl: () => Response) {
  return vi.fn(async (url: string, init?: { body?: string }) => {
    const u = String(url);
    if (u.includes('/v1/responses')) return responsesImpl();
    if (u.includes('/v1/chat/completions')) {
      const name = JSON.parse(init?.body ?? '{}')?.response_format?.json_schema?.name;
      if (name === 'angles') return chatContent({ angles: ['reliability', 'price in India'] });
      if (name === 'verified') return chatContent({ digest: 'Verified: reliable; priced ~₹1.3L.' });
      return chatContent({});
    }
    return { ok: false, status: 404 } as Response;
  });
}

describe('runAgentic', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('plans, researches via web, and verifies — producing web citations + a digest', async () => {
    vi.stubGlobal(
      'fetch',
      route(() =>
        json({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: 'Owners report it is reliable.',
                  annotations: [{ type: 'url_citation', url: 'https://rtings.com/x', title: 'RTINGS' }],
                },
              ],
            },
          ],
        }),
      ),
    );
    const r = await runAgentic('iPhone 17 Pro', settings, new AbortController().signal);
    expect(r.webCount).toBeGreaterThan(0);
    expect(r.webItems[0]?.source).toBe('expert');
    expect(r.verifiedDigest).toMatch(/verified/i);
  });

  it('falls back to empty (no verify call) when web search returns nothing', async () => {
    vi.stubGlobal('fetch', route(() => ({ ok: false, status: 404 }) as Response));
    const r = await runAgentic('Obscure Product', settings, new AbortController().signal);
    expect(r.webCount).toBe(0);
    expect(r.webItems).toHaveLength(0);
    expect(r.verifiedDigest).toBe('');
  });
});
