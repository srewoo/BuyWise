import { storage } from '@/lib/storage';
import type { Verdict, Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';

const VERDICT_TTL = 24 * 60 * 60 * 1000; // 24h

interface Cached {
  t: number;
  v: Verdict;
  sources: Citation[];
  coverage: Coverage[];
}

export interface CachedResult {
  verdict: Verdict;
  sources: Citation[];
  coverage: Coverage[];
}

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

export const cache = {
  async getResult(query: string): Promise<CachedResult | null> {
    const all = await storage.raw.get<Record<string, Cached>>('local', 'verdictCache', {});
    const hit = all[norm(query)];
    if (hit && Date.now() - hit.t < VERDICT_TTL) {
      return { verdict: hit.v, sources: hit.sources ?? [], coverage: hit.coverage ?? [] };
    }
    return null;
  },
  async getVerdict(query: string): Promise<Verdict | null> {
    return (await this.getResult(query))?.verdict ?? null;
  },
  async putVerdict(
    query: string,
    v: Verdict,
    extra: { sources?: Citation[]; coverage?: Coverage[] } = {},
  ): Promise<void> {
    const all = await storage.raw.get<Record<string, Cached>>('local', 'verdictCache', {});
    all[norm(query)] = { t: Date.now(), v, sources: extra.sources ?? [], coverage: extra.coverage ?? [] };
    // keep the cache bounded (last 40 products)
    const entries = Object.entries(all)
      .sort((a, b) => b[1].t - a[1].t)
      .slice(0, 40);
    await storage.raw.set('local', 'verdictCache', Object.fromEntries(entries));
  },
};
