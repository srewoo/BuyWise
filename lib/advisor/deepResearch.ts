import type { ReviewItem } from '@/lib/types';
import type { Settings } from '@/lib/storage';
import { getRegion } from '@/lib/regions';
import { youtubeAdapter } from './sources/youtubeAdapter';
import { dedupe, type Coverage } from './orchestrator';
import { chatJSON } from './openai';

const UA = 'web:buywise:0.1 (buying advisor)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RedditPost {
  id: string;
  title?: string;
  selftext?: string;
  permalink?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
}

/** LLM plans adaptive research queries; falls back to heuristics on any failure. */
async function planQueries(product: string, settings: Settings, signal: AbortSignal): Promise<string[]> {
  const region = getRegion(settings.region);
  const fallback = [
    `${product} review`,
    `${product} problems`,
    `${product} long term review`,
    `${product} vs`,
  ];
  try {
    const out = await chatJSON<{ queries: string[] }>({
      apiKey: settings.openaiKey,
      model: settings.model || 'gpt-5',
      system:
        'You plan product-research search queries. Output 4-5 short, varied queries to surface honest reviews, recurring problems, comparisons, and long-term owner experiences. Bias to the given region when relevant.',
      user: `Product: ${product}\nRegion: ${region.name}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['queries'],
        properties: { queries: { type: 'array', items: { type: 'string' } } },
      },
      schemaName: 'queries',
      signal,
      maxTokens: 300,
    });
    const qs = out.queries?.filter((q) => typeof q === 'string' && q.trim()).slice(0, 5);
    return qs && qs.length ? qs : fallback;
  } catch {
    return fallback;
  }
}

async function redditSearch(query: string, signal: AbortSignal): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&t=year&limit=8`;
    const res = await fetch(url, { signal, headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { children?: { data: RedditPost }[] } };
    return (json.data?.children ?? []).map((c) => c.data).filter((d) => (d.title || '').length > 5);
  } catch {
    return [];
  }
}

/** Fetch the real top-level comments of a Reddit post — the actual owner discussion. */
async function redditComments(permalink: string, signal: AbortSignal): Promise<ReviewItem[]> {
  try {
    const res = await fetch(`https://www.reddit.com${permalink}.json?limit=20&sort=top`, {
      signal,
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{ data?: { children?: { kind: string; data: any }[] } }>;
    const comments = json[1]?.data?.children ?? [];
    return comments
      .filter((c) => c.kind === 't1' && c.data?.body && c.data.body.length > 40)
      .sort((a, b) => (b.data.score ?? 0) - (a.data.score ?? 0))
      .slice(0, 6)
      .map((c, i) => ({
        id: `reddit:${c.data.id ?? i}`,
        source: 'reddit' as const,
        url: `https://www.reddit.com${permalink}`,
        author: c.data.author,
        text: String(c.data.body).replace(/\s+/g, ' ').slice(0, 700),
        score: c.data.score,
      }));
  } catch {
    return [];
  }
}

export interface DeepProgress {
  stage: 'collecting' | 'discussions' | 'analyzing';
  message?: string;
}

/**
 * Deep research: plan queries → multi-query Reddit search → read the actual top
 * comment threads → plus YouTube → dedupe. Real fetched content, not model recall.
 */
export async function deepGather(
  product: string,
  settings: Settings,
  signal: AbortSignal,
  onProgress: (p: DeepProgress) => void = () => {},
): Promise<{ items: ReviewItem[]; coverage: Coverage[]; queries: string[]; duplicatesRemoved: number }> {
  onProgress({ stage: 'collecting', message: 'Planning research queries' });
  const queries = await planQueries(product, settings, signal);

  // 1) multi-query Reddit search
  onProgress({ stage: 'collecting', message: `Searching ${queries.length} queries` });
  const posts: RedditPost[] = [];
  const seenPost = new Set<string>();
  for (const q of queries.slice(0, 5)) {
    const found = await redditSearch(q, signal);
    for (const p of found) {
      if (p.id && !seenPost.has(p.id)) {
        seenPost.add(p.id);
        posts.push(p);
      }
    }
    await sleep(250); // be gentle with Reddit's unauthenticated limits
  }

  const items: ReviewItem[] = [];
  // post bodies as items
  for (const p of posts) {
    const body = `${p.title ?? ''}\n${p.selftext ?? ''}`.trim();
    if (body.length > 30) {
      items.push({
        id: `reddit:${p.id}`,
        source: 'reddit',
        url: p.permalink ? `https://www.reddit.com${p.permalink}` : 'https://www.reddit.com',
        author: p.author,
        title: p.title,
        text: body.slice(0, 900),
        score: p.score,
        publishedAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : undefined,
      });
    }
  }

  // 2) read the real comment threads of the most-discussed posts
  onProgress({ stage: 'discussions', message: 'Reading top discussion threads' });
  const topPosts = posts
    .filter((p) => p.permalink)
    .sort((a, b) => (b.num_comments ?? 0) - (a.num_comments ?? 0))
    .slice(0, 8);
  for (const p of topPosts) {
    const cs = await redditComments(p.permalink!, signal);
    items.push(...cs);
    await sleep(200);
  }
  const redditCount = items.length;

  // 3) YouTube (standard adapter, if configured)
  let ytCount = 0;
  let ytStatus: Coverage = { source: 'youtube', name: 'youtube-data-v3', status: 'skipped', reason: 'missing_credentials', count: 0 };
  if (youtubeAdapter.isConfigured(settings)) {
    onProgress({ stage: 'collecting', message: 'Scanning YouTube reviews' });
    const yt = await youtubeAdapter.fetch({ product, limit: 20 }, settings, signal);
    if (yt.ok) {
      items.push(...yt.items);
      ytCount = yt.items.length;
      ytStatus = { source: 'youtube', name: 'youtube-data-v3', status: 'ok', count: ytCount };
    } else {
      ytStatus = { source: 'youtube', name: 'youtube-data-v3', status: 'skipped', reason: yt.reason, count: 0 };
    }
  }

  const coverage: Coverage[] = [
    redditCount > 0
      ? { source: 'reddit', name: 'reddit-deep', status: 'ok', count: redditCount }
      : { source: 'reddit', name: 'reddit-deep', status: 'skipped', reason: 'no_results', count: 0 },
    ytStatus,
  ];

  const deduped = dedupe(items);
  return { items: deduped, coverage, queries, duplicatesRemoved: items.length - deduped.length };
}
