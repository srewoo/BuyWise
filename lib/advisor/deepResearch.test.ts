import { describe, it, expect, vi, afterEach } from 'vitest';
import { deepGather } from '@/lib/advisor/deepResearch';
import { DEFAULT_SETTINGS } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());

describe('deepGather (deep research loop)', () => {
  it('plans queries, searches Reddit, reads comment threads, and skips YouTube without a key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes('api.openai.com')) {
          // planQueries response
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify({ queries: ['vivo x300 review', 'vivo x300 problems'] }) } }],
            }),
          } as unknown as Response;
        }
        if (u.includes('search.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                children: [
                  {
                    data: {
                      id: 'p1',
                      title: 'vivo x300 review',
                      selftext: 'Great compact camera phone with solid battery life, used it for weeks.',
                      permalink: '/r/phones/p1',
                      score: 80,
                      num_comments: 40,
                    },
                  },
                ],
              },
            }),
          } as unknown as Response;
        }
        if (u.includes('/p1.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              { data: { children: [] } },
              {
                data: {
                  children: [
                    {
                      kind: 't1',
                      data: { id: 'c1', body: 'Used it two months — camera excellent but it warms up while gaming.', score: 25, author: 'u1' },
                    },
                  ],
                },
              },
            ],
          } as unknown as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      }),
    );

    const settings = { ...DEFAULT_SETTINGS, openaiKey: 'sk-test', youtubeKey: '' };
    const { items, coverage, queries } = await deepGather('vivo x300', settings, new AbortController().signal);

    expect(queries.length).toBeGreaterThan(0);
    expect(items.length).toBeGreaterThan(0); // post body + at least one real comment
    expect(items.some((i) => i.text.includes('warms up'))).toBe(true); // read the comment thread
    const reddit = coverage.find((c) => c.source === 'reddit');
    expect(reddit?.status).toBe('ok');
    const yt = coverage.find((c) => c.source === 'youtube');
    expect(yt?.status).toBe('skipped');
  });
});
