import { describe, it, expect, vi, afterEach } from 'vitest';
import { youtubeAdapter } from '@/lib/advisor/sources/youtubeAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());
const sig = () => new AbortController().signal;
const json = (b: unknown) => ({ ok: true, status: 200, json: async () => b }) as Response;

describe('youtubeAdapter', () => {
  it('requires a key', () => {
    expect(youtubeAdapter.isConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(youtubeAdapter.isConfigured({ ...DEFAULT_SETTINGS, youtubeKey: 'k' })).toBe(true);
  });

  it('skips with missing_credentials when no key', async () => {
    const r = await youtubeAdapter.fetch({ product: 'x', limit: 5 }, DEFAULT_SETTINGS, sig());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_credentials');
  });

  it('returns videos + comments on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/search'))
          return json({ items: [{ id: { videoId: 'v1' }, snippet: { title: 'XM6 review', channelTitle: 'Tech', description: 'd', publishedAt: '2026' } }] });
        return json({ items: [{ snippet: { topLevelComment: { snippet: { textDisplay: 'great ANC', authorDisplayName: 'u', likeCount: 5 } } } }] });
      }),
    );
    const r = await youtubeAdapter.fetch({ product: 'XM6', limit: 5 }, { ...DEFAULT_SETTINGS, youtubeKey: 'k' }, sig());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.length).toBeGreaterThanOrEqual(2);
      expect(r.items[0]?.source).toBe('youtube');
    }
  });

  it('treats 403 as rate_limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 }) as Response));
    const r = await youtubeAdapter.fetch({ product: 'x', limit: 5 }, { ...DEFAULT_SETTINGS, youtubeKey: 'k' }, sig());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('rate_limited');
  });
});
