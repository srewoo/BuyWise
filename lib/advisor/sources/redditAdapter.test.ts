import { describe, it, expect, vi, afterEach } from 'vitest';
import { redditAdapter } from '@/lib/advisor/sources/redditAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());
const sig = () => new AbortController().signal;

describe('redditAdapter', () => {
  it('is always configured (no key needed)', () => {
    expect(redditAdapter.isConfigured(DEFAULT_SETTINGS)).toBe(true);
  });

  it('parses search results into review items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              children: [
                { data: { id: 'p1', title: 'Long review', selftext: 'detailed thoughts about the product over time', permalink: '/r/x/p1', score: 30 } },
              ],
            },
          }),
        }) as Response,
      ),
    );
    const r = await redditAdapter.fetch({ product: 'XM6', limit: 10 }, DEFAULT_SETTINGS, sig());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items[0]?.source).toBe('reddit');
  });

  it('treats 429 as rate_limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429 }) as Response));
    const r = await redditAdapter.fetch({ product: 'x', limit: 10 }, DEFAULT_SETTINGS, sig());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('rate_limited');
  });
});
