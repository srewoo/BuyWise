import type { ReviewItem } from '@/lib/types';
import type { SourceAdapter, FetchQuery, FetchResult } from './SourceAdapter';
import type { Settings } from '@/lib/storage';
import { getRegion } from '@/lib/regions';
import { classifyCategory } from '@/lib/categories';
import { responsesWebSearch } from '../openai';

/**
 * Expert & forum evidence — category-aware. Uses OpenAI's live web search scoped to the review
 * sites and enthusiast forums that matter for THIS product's category (car forums for a car,
 * running-shoe review sites for a shoe, skincare databases for a serum, …). This is the lever
 * that deepens the verdict beyond Reddit + YouTube for every category.
 *
 * Configured only when an OpenAI key is present (web search runs through it). Never throws —
 * degrades to no_results so the orchestrator records it as a skipped source.
 */
export const expertAdapter: SourceAdapter = {
  kind: 'expert',
  name: 'expert-web-search',
  isConfigured: (s: Settings) => !!s.openaiKey,

  async fetch(q: FetchQuery, settings: Settings, signal: AbortSignal): Promise<FetchResult> {
    if (!settings.openaiKey) return { ok: false, reason: 'missing_credentials', items: [] };
    try {
      const region = getRegion(settings.region);
      const cat = classifyCategory(q.product);
      const sites = cat.expertSites.slice(0, 5).join(', ');
      const prompt =
        `Summarize what expert reviewers and long-term owners say about "${q.product}" (market: ${region.name}, ` +
        `category: ${cat.label}). Prioritise these sources: ${sites}. ` +
        `Cover the criteria that matter for this category: ${cat.keyFactLabels.join(', ')}. ` +
        `Report concrete pros, cons, and recurring complaints. Be factual and specific; cite your sources.`;

      const finding = await responsesWebSearch(settings.openaiKey, settings.model || 'gpt-5', prompt, signal);
      if (!finding?.text) return { ok: false, reason: 'no_results', items: [] };

      const items: ReviewItem[] = [
        {
          id: 'expert:digest',
          source: 'expert',
          url: finding.citations[0]?.url ?? '',
          title: `Expert & owner review digest — ${cat.label}`,
          text: finding.text.slice(0, 1600),
        },
        // Each cited source becomes a lightweight item so coverage + citations reflect real breadth.
        ...finding.citations.slice(0, 6).map((c, i) => ({
          id: `expert:cite:${i}`,
          source: 'expert' as const,
          url: c.url,
          title: c.title,
          text: c.title,
        })),
      ];

      return { ok: true, items };
    } catch {
      return { ok: false, reason: 'upstream_error', items: [] };
    }
  },
};
