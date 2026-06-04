import type { ReviewItem, SourceKind } from '@/lib/types';
import type { Settings } from '@/lib/storage';
import { type SourceAdapter, withTimeout } from './sources/SourceAdapter';
import { redditAdapter } from './sources/redditAdapter';
import { youtubeAdapter } from './sources/youtubeAdapter';

const ADAPTERS: SourceAdapter[] = [redditAdapter, youtubeAdapter];

export interface Coverage {
  source: SourceKind;
  name: string;
  status: 'ok' | 'skipped';
  reason?: string;
  count: number;
}

export interface GatherResult {
  items: ReviewItem[];
  coverage: Coverage[];
  duplicatesRemoved: number;
}

/**
 * Gather reviews/discussions from every configured source in parallel.
 * One slow or failing source never blocks the verdict — each is timed out and
 * its failure recorded in `coverage` rather than thrown.
 */
export async function gather(
  product: string,
  settings: Settings,
  opts: { limit?: number; timeoutMs?: number } = {},
): Promise<GatherResult> {
  const limit = opts.limit ?? 20;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const controller = new AbortController();
  const configured = ADAPTERS.filter((a) => a.isConfigured(settings));

  const settled = await Promise.allSettled(
    configured.map((a) =>
      withTimeout(a.fetch({ product, limit }, settings, controller.signal), timeoutMs, controller.signal).then(
        (r) => ({ adapter: a, result: r }),
      ),
    ),
  );

  const items: ReviewItem[] = [];
  const coverage: Coverage[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!;
    const adapter = configured[i]!;
    if (s.status === 'fulfilled' && s.value.result.ok) {
      items.push(...s.value.result.items);
      coverage.push({ source: adapter.kind, name: adapter.name, status: 'ok', count: s.value.result.items.length });
    } else {
      let reason = 'upstream_error';
      if (s.status === 'fulfilled' && !s.value.result.ok) reason = s.value.result.reason;
      coverage.push({ source: adapter.kind, name: adapter.name, status: 'skipped', reason, count: 0 });
      console.info('[BuyWise] source skipped', { adapter: adapter.name, reason, product });
    }
  }

  // adapters that weren't even configured (so the UI can prompt for keys)
  for (const a of ADAPTERS.filter((x) => !x.isConfigured(settings))) {
    coverage.push({ source: a.kind, name: a.name, status: 'skipped', reason: 'missing_credentials', count: 0 });
  }

  const deduped = dedupe(items);
  return { items: deduped, coverage, duplicatesRemoved: items.length - deduped.length };
}

/** Cheap near-duplicate removal (normalized prefix) — collapses reposts across sources. */
export function dedupe(items: ReviewItem[]): ReviewItem[] {
  const seen = new Set<string>();
  const out: ReviewItem[] = [];
  for (const it of items) {
    const key = it.text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}
