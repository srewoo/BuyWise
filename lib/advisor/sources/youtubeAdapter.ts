import type { ReviewItem } from '@/lib/types';
import type { SourceAdapter, FetchQuery, FetchResult } from './SourceAdapter';
import type { Settings } from '@/lib/storage';
import { getRegion } from '@/lib/regions';

interface YtSearchItem {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string; description: string; publishedAt: string };
}
interface YtComment {
  snippet: {
    topLevelComment: { snippet: { textDisplay: string; authorDisplayName: string; likeCount: number } };
  };
}

/**
 * YouTube Data API v3 — free key from Google Cloud (no login/OAuth).
 * search.list (100 units) → commentThreads.list (1 unit each) for the top videos.
 */
export const youtubeAdapter: SourceAdapter = {
  kind: 'youtube',
  name: 'youtube-data-v3',
  isConfigured: (s) => !!s.youtubeKey,

  async fetch(q: FetchQuery, settings: Settings, signal: AbortSignal): Promise<FetchResult> {
    const key = settings.youtubeKey;
    if (!key) return { ok: false, reason: 'missing_credentials', items: [] };
    try {
      const hint = getRegion(settings.region).queryHint;
      const query = `${q.product} review${hint ? ` ${hint}` : ''}`;
      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance` +
        `&maxResults=5&q=${encodeURIComponent(query)}&key=${key}`;
      const sres = await fetch(searchUrl, { signal });
      if (sres.status === 403) return { ok: false, reason: 'rate_limited', items: [] };
      if (!sres.ok) return { ok: false, reason: 'upstream_error', items: [] };
      const sjson = (await sres.json()) as { items?: YtSearchItem[] };
      const vids = (sjson.items ?? []).filter((i) => i.id.videoId);

      const items: ReviewItem[] = [];
      for (const vid of vids) {
        const vId = vid.id.videoId!;
        items.push({
          id: `youtube:${vId}`,
          source: 'youtube',
          url: `https://www.youtube.com/watch?v=${vId}`,
          author: vid.snippet.channelTitle,
          title: vid.snippet.title,
          text: `${vid.snippet.title}\n${vid.snippet.description}`.slice(0, 800),
          publishedAt: vid.snippet.publishedAt,
        });
        // top comments add real owner sentiment (1 quota unit each)
        try {
          const cUrl =
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=relevance` +
            `&maxResults=8&videoId=${vId}&key=${key}`;
          const cres = await fetch(cUrl, { signal });
          if (cres.ok) {
            const cjson = (await cres.json()) as { items?: YtComment[] };
            for (const c of cjson.items ?? []) {
              const cs = c.snippet.topLevelComment.snippet;
              items.push({
                id: `youtube:${vId}:c:${items.length}`,
                source: 'youtube',
                url: `https://www.youtube.com/watch?v=${vId}`,
                author: cs.authorDisplayName,
                text: cs.textDisplay.replace(/<[^>]+>/g, '').slice(0, 600),
                score: cs.likeCount,
              });
            }
          }
        } catch {
          /* comments are best-effort */
        }
      }
      return items.length ? { ok: true, items } : { ok: false, reason: 'no_results', items: [] };
    } catch {
      return { ok: false, reason: 'upstream_error', items: [] };
    }
  },
};
