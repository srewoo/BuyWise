import type { ReviewItem, SourceKind } from '@/lib/types';
import type { Settings } from '@/lib/storage';

export type SkipReason =
  | 'missing_credentials'
  | 'rate_limited'
  | 'upstream_error'
  | 'disabled'
  | 'no_results';

export type FetchResult =
  | { ok: true; items: ReviewItem[]; partial?: boolean }
  | { ok: false; reason: SkipReason; items: [] };

export interface FetchQuery {
  product: string;
  limit: number;
}

export interface SourceAdapter {
  readonly kind: SourceKind;
  readonly name: string;
  /** Cheap synchronous check — are the required keys present / feature enabled? */
  isConfigured(settings: Settings): boolean;
  /** Never throws — returns { ok:false, reason } on any failure or skip. */
  fetch(q: FetchQuery, settings: Settings, signal: AbortSignal): Promise<FetchResult>;
}

/** Wrap a fetch with a timeout that aborts via the shared signal. */
export async function withTimeout<T>(p: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), ms);
      signal.addEventListener('abort', () => {
        clearTimeout(id);
        reject(new Error('aborted'));
      });
    }),
  ]);
}
