import type { Verdict, Citation, ReviewItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { cache } from '@/lib/cache';
import { sampleVerdict } from '@/lib/mock';
import { gather, type Coverage } from './orchestrator';
import { deepGather } from './deepResearch';
import { runPipeline } from './pipeline';
import { computeTrust } from './trust';
import { computeSentiment } from './sentiment';
import { runAgentic } from './agent';
import { priceHistory } from '@/lib/priceHistory';
import { buildDealInfo } from './dealInfo';
import { notifyPriceDrop } from '@/lib/notify';
import { getRegion } from '@/lib/regions';
import type { DealInfo } from '@/lib/types';
import type { Settings } from '@/lib/storage';

export type AdviseStage =
  | 'cache'
  | 'collecting'
  | 'discussions'
  | 'planning'
  | 'researching'
  | 'verifying'
  | 'analyzing'
  | 'done'
  | 'error';

export interface AdviseProgress {
  stage: AdviseStage;
  message?: string;
  coverage?: Coverage[];
}

export type AdviseMode = 'live' | 'demo' | 'cached';

export interface AdviseResult {
  verdict: Verdict;
  mode: AdviseMode;
  coverage: Coverage[];
  sources: Citation[];
  /** true when the verdict was built from real fetched sources (not just model knowledge). */
  grounded: boolean;
  error?: string;
}

/**
 * The full client-side advisor run:
 *   cache → gather live sources → GPT-5 pipeline → cache.
 * Degrades gracefully: no OpenAI key → seeded demo verdict (so the UI always works).
 */
export interface SeedReview {
  title?: string;
  text: string;
  rating?: number;
  verified?: boolean;
}

export interface AdviseOptions {
  /** Reviews read from the product page the user is currently on (e.g. Amazon/Flipkart). */
  seedReviews?: SeedReview[];
  pageUrl?: string;
  /** Current price read from the product page (powers real deals + self-built history). */
  pagePrice?: { amount: number; currency: string };
  /** Struck-through "original"/MRP price the store advertises against (for deal-truth). */
  pageListPrice?: number;
  retailer?: string;
  /** Aggregate rating shown on the product page. */
  rating?: { average?: number; count?: number };
}

/** Build Deal Finder data from the real on-page price + self-built history (no fabrication). */
async function buildDeals(product: string, settings: Settings, opts: AdviseOptions): Promise<DealInfo> {
  const region = getRegion(settings.region);
  const tracked = opts.pagePrice
    ? await priceHistory.record(product, opts.pagePrice.amount, opts.pagePrice.currency)
    : await priceHistory.get(product);

  // An on-page price is a real observation — satisfy any standing alert for this product.
  if (opts.pagePrice) {
    const triggered = await storage.checkAlerts(product, opts.pagePrice.amount, opts.pagePrice.currency);
    if (triggered) notifyPriceDrop(triggered);
  }

  return buildDealInfo({
    points: tracked?.points ?? [],
    currency: tracked?.currency ?? region.currency,
    current: opts.pagePrice?.amount,
    listPrice: opts.pageListPrice,
    retailer: opts.retailer ?? region.retailers[0]!,
    url: opts.pageUrl,
    emptyAdvice:
      "No live price captured yet — open this product's listing on any store page, or tap “Log the price you see” below to enter a shop-tag or showroom price. The verdict above still holds regardless of channel.",
  });
}

export async function runAdvisor(
  query: string,
  onProgress: (p: AdviseProgress) => void = () => {},
  signal: AbortSignal = new AbortController().signal,
  opts: AdviseOptions = {},
): Promise<AdviseResult> {
  const product = query.trim();
  const seed: ReviewItem[] = (opts.seedReviews ?? [])
    .filter((r) => r.text && r.text.length > 15)
    .slice(0, 12)
    .map((r, i) => ({
      id: `retail:${i}`,
      source: 'retail' as const,
      url: opts.pageUrl ?? '',
      title: r.title,
      text: r.text,
      rating: r.rating,
      verifiedPurchase: !!r.verified,
    }));

  // 1) cache — but bypass it when we have fresh on-page data (price/rating/reviews),
  //    so the verdict reflects the page you're actually looking at, not a stale run.
  const hasPageData = !!(opts.pagePrice || opts.rating?.count || (opts.seedReviews?.length ?? 0) > 0);
  const cachedResult = hasPageData ? null : await cache.getResult(product);
  if (cachedResult) {
    onProgress({ stage: 'done' });
    return {
      verdict: cachedResult.verdict,
      mode: 'cached',
      coverage: cachedResult.coverage,
      sources: cachedResult.sources,
      grounded: cachedResult.sources.length > 0,
    };
  }

  const settings = await storage.getSettings();

  // 2) no key → demo mode (still fully usable)
  if (!settings.openaiKey) {
    onProgress({ stage: 'analyzing', message: 'Demo mode — add an OpenAI key in Settings for live results' });
    onProgress({ stage: 'done' });
    return { verdict: sampleVerdict(product), mode: 'demo', coverage: [], sources: [], grounded: false };
  }

  try {
    // 3) gather live sources — deep research reads real comment threads across many queries
    onProgress({ stage: 'collecting', message: 'Collecting reviews & discussions' });
    const gathered = settings.deepResearch
      ? await deepGather(product, settings, signal, (p) => onProgress({ stage: p.stage, message: p.message }))
      : await gather(product, settings, { limit: 20, timeoutMs: 8000 });

    // Deep mode → multi-agent web research (plan → research → verify) on top of local sources.
    let webItems: ReviewItem[] = [];
    let verifiedDigest = '';
    if (settings.deepResearch) {
      const ag = await runAgentic(product, settings, signal, (p) => onProgress({ stage: p.stage, message: p.message }));
      webItems = ag.webItems;
      verifiedDigest = ag.verifiedDigest;
    }

    // merge: on-page retail reviews + local discussions + web-cited findings
    const items = [...seed, ...gathered.items, ...webItems];
    const coverage: Coverage[] = [
      ...(seed.length
        ? [{ source: 'retail' as const, name: 'on-page-reviews', status: 'ok' as const, count: seed.length }]
        : []),
      ...gathered.coverage,
      ...(settings.deepResearch
        ? [
            webItems.length
              ? { source: 'expert' as const, name: 'web-search', status: 'ok' as const, count: webItems.length }
              : { source: 'expert' as const, name: 'web-search', status: 'skipped' as const, reason: 'no_results', count: 0 },
          ]
        : []),
    ];
    onProgress({ stage: 'analyzing', message: 'Running AI analysis', coverage });

    // real citations from what we actually fetched
    const sources: Citation[] = items.slice(0, 18).map((i) => ({
      source: i.source,
      title: (i.title || i.text).replace(/\s+/g, ' ').slice(0, 90),
      url: i.url,
    }));

    // Strong on-page context — the user is literally viewing the product on a store page,
    // so the model must NOT claim it's unavailable in the region.
    let pageContext = '';
    if (opts.retailer || opts.pagePrice || opts.rating?.count) {
      const region = getRegion(settings.region);
      const bits = [
        `The user is currently viewing this product on ${opts.retailer ?? 'a store page'} in ${region.name}; treat it as AVAILABLE there and do NOT say it is unavailable/unreleased in ${region.name}.`,
      ];
      if (opts.pagePrice) bits.push(`Listed price: ${opts.pagePrice.currency} ${opts.pagePrice.amount.toLocaleString()}.`);
      if (opts.rating?.count)
        bits.push(`On-page rating: ${opts.rating.average ?? '?'}★ from ${opts.rating.count.toLocaleString()} ratings.`);
      pageContext = bits.join(' ');
    }
    if (verifiedDigest) pageContext += `\n\nVERIFIED WEB RESEARCH (fact-checked):\n${verifiedDigest}`;

    // 4) pipeline
    const verdict = await runPipeline(product, settings, items, signal, pageContext);

    // 5) replace LLM-estimated fields with real, data-derived ones:
    //    - trust: computed from the fetched reviews (forensics, not a guess)
    //    - community sentiment: computed from the corpus (ratings + lexicon)
    //    - deals: real on-page price + self-built history (never fabricated competitor prices)
    const deals = await buildDeals(product, settings, opts);
    const finalVerdict =
      items.length > 0
        ? {
            ...verdict,
            trust: computeTrust(items, gathered.duplicatesRemoved),
            community: computeSentiment(items),
            deals,
          }
        : { ...verdict, deals };

    await cache.putVerdict(product, finalVerdict, { sources, coverage });
    await storage.pushHistory(product);

    onProgress({ stage: 'done', coverage });
    return { verdict: finalVerdict, mode: 'live', coverage, sources, grounded: items.length > 0 };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    onProgress({ stage: 'error', message });
    // fall back to a clearly-labeled sample so the panel still shows something useful
    return {
      verdict: sampleVerdict(product),
      mode: 'demo',
      coverage: [],
      sources: [],
      grounded: false,
      error: message,
    };
  }
}
