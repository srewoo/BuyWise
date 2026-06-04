import { describe, it, expect, vi, afterEach } from 'vitest';
import { perplexitySearch } from '@/lib/advisor/perplexity';

afterEach(() => vi.unstubAllGlobals());

describe('perplexitySearch', () => {
  it('returns null when no key is set (never calls the network)', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await perplexitySearch('', 'q', new AbortController().signal)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('parses content + citations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'It is solid.' } }],
            citations: ['https://a.com', 'https://b.com'],
          }),
        }) as Response,
      ),
    );
    const r = await perplexitySearch('pplx', 'q', new AbortController().signal);
    expect(r?.text).toBe('It is solid.');
    expect(r?.citations).toHaveLength(2);
    expect(r?.citations[0]).toEqual({ title: 'https://a.com', url: 'https://a.com' });
  });

  it('returns null on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 }) as Response));
    expect(await perplexitySearch('pplx', 'q', new AbortController().signal)).toBeNull();
  });
});
