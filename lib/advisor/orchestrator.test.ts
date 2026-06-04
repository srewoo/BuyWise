import { describe, it, expect, vi, afterEach } from 'vitest';
import { gather } from '@/lib/advisor/orchestrator';
import { redditAdapter } from '@/lib/advisor/sources/redditAdapter';
import { youtubeAdapter } from '@/lib/advisor/sources/youtubeAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());

describe('source adapters', () => {
  it('reddit is always configured (no key needed)', () => {
    expect(redditAdapter.isConfigured(DEFAULT_SETTINGS)).toBe(true);
  });
  it('youtube requires a key', () => {
    expect(youtubeAdapter.isConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(youtubeAdapter.isConfigured({ ...DEFAULT_SETTINGS, youtubeKey: 'k' })).toBe(true);
  });
});

describe('gather (graceful degradation)', () => {
  it('returns reddit items and records unconfigured sources without throwing', async () => {
    const redditJson = {
      data: {
        children: [
          {
            data: {
              id: 'abc',
              title: 'Sony WH-1000XM6 long term review',
              selftext: 'After three months the noise cancelling is genuinely the best I have used, sound is great.',
              permalink: '/r/headphones/abc',
              author: 'u/test',
              score: 412,
              created_utc: 1717000000,
            },
          },
        ],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => redditJson }) as unknown as Response),
    );

    const { items, coverage } = await gather('Sony WH-1000XM6', DEFAULT_SETTINGS, { timeoutMs: 2000 });

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.source).toBe('reddit');
    // youtube has no key → recorded as skipped, not thrown
    const yt = coverage.find((c) => c.source === 'youtube');
    expect(yt?.status).toBe('skipped');
    expect(yt?.reason).toBe('missing_credentials');
  });

  it('does not throw when a source errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const { items } = await gather('anything', DEFAULT_SETTINGS, { timeoutMs: 1000 });
    expect(Array.isArray(items)).toBe(true); // degrades to empty, no throw
  });
});
