import { describe, it, expect, vi, afterEach } from 'vitest';
import { expertAdapter } from '@/lib/advisor/sources/expertAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());
const sig = () => new AbortController().signal;

describe('expertAdapter', () => {
  it('is configured only when an OpenAI key is present', () => {
    expect(expertAdapter.isConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(expertAdapter.isConfigured({ ...DEFAULT_SETTINGS, openaiKey: 'sk-x' })).toBe(true);
  });

  it('returns a category-aware digest + per-citation items from web search', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: 'Owners praise the RAV4 hybrid mileage; some note road noise.',
                    annotations: [
                      { type: 'url_citation', url: 'https://www.edmunds.com/toyota/rav4', title: 'Edmunds RAV4' },
                      { type: 'url_citation', url: 'https://www.caranddriver.com/rav4', title: 'C/D RAV4' },
                    ],
                  },
                ],
              },
            ],
          }),
        }) as Response,
      ),
    );
    const r = await expertAdapter.fetch({ product: 'Toyota RAV4', limit: 10 }, { ...DEFAULT_SETTINGS, openaiKey: 'sk-x' }, sig());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.every((i) => i.source === 'expert')).toBe(true);
      expect(r.items[0]?.title).toMatch(/Vehicles/); // category label in the digest title
      expect(r.items.length).toBeGreaterThan(1); // digest + citation items
    }
  });

  it('degrades to no_results when web search yields nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    const r = await expertAdapter.fetch({ product: 'X', limit: 10 }, { ...DEFAULT_SETTINGS, openaiKey: 'sk-x' }, sig());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_results');
  });
});
