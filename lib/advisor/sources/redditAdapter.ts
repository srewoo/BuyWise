import type { ReviewItem } from '@/lib/types';
import type { SourceAdapter, FetchQuery, FetchResult } from './SourceAdapter';
import type { Settings } from '@/lib/storage';
import { getRegion } from '@/lib/regions';
import { classifyCategory } from '@/lib/categories';

interface RedditChild {
  data: {
    id: string;
    title?: string;
    selftext?: string;
    body?: string;
    permalink?: string;
    author?: string;
    score?: number;
    created_utc?: number;
    num_comments?: number;
  };
}

/**
 * Reddit — free, no key. Uses the public search JSON endpoint.
 * Throttled & best-effort; degrades to no_results on any failure.
 */
export const redditAdapter: SourceAdapter = {
  kind: 'reddit',
  name: 'reddit-public-json',
  isConfigured: () => true, // always available; no key required

  async fetch(q: FetchQuery, settings: Settings, signal: AbortSignal): Promise<FetchResult> {
    try {
      const hint = getRegion(settings.region).queryHint;
      // Add one category term ("ownership", "fit", "reliability"…) to raise relevance without
      // narrowing recall the way a hard subreddit filter would. Category-targeted forum/expert
      // depth is the expertAdapter's job; Reddit stays the broad, free baseline.
      const catTerm = classifyCategory(q.product).queryTerms[0] ?? '';
      const query = `${q.product} review${catTerm ? ` ${catTerm}` : ''}${hint ? ` ${hint}` : ''}`;
      const url =
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}` +
        `&sort=top&t=year&limit=${Math.min(q.limit, 25)}`;
      const res = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'web:reviewlens-ai:0.1 (buying advisor)' },
      });
      if (res.status === 429) return { ok: false, reason: 'rate_limited', items: [] };
      if (!res.ok) return { ok: false, reason: 'upstream_error', items: [] };

      const json = (await res.json()) as { data?: { children?: RedditChild[] } };
      const children = json.data?.children ?? [];
      const items: ReviewItem[] = children
        .map((c) => c.data)
        .filter((d) => (d.selftext || d.title || '').length > 30)
        .map((d) => ({
          id: `reddit:${d.id}`,
          source: 'reddit' as const,
          url: d.permalink ? `https://www.reddit.com${d.permalink}` : 'https://www.reddit.com',
          author: d.author,
          title: d.title,
          text: `${d.title ?? ''}\n${d.selftext ?? ''}`.trim().slice(0, 1200),
          score: d.score,
          publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        }));

      return items.length ? { ok: true, items } : { ok: false, reason: 'no_results', items: [] };
    } catch {
      return { ok: false, reason: 'upstream_error', items: [] };
    }
  },
};
