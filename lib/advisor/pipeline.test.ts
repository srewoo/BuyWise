import { describe, it, expect, vi, afterEach } from 'vitest';
import { runPipeline } from '@/lib/advisor/pipeline';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import type { ReviewItem } from '@/lib/types';

afterEach(() => vi.unstubAllGlobals());

// A schema-valid raw verdict as the model would return it (nulls for optional fields).
const RAW = {
  product: 'placeholder',
  category: null,
  decision: 'buy',
  confidence: 0.8,
  oneLiner: 'Great.',
  overview: 'Solid product.',
  marketPosition: 'Flagship',
  reviewsAnalyzed: 999,
  pros: [{ label: 'Battery', detail: null, strength: 0.9, mentions: null }],
  cons: [{ label: 'Price', detail: null, strength: 0.5, mentions: null }],
  community: [],
  trust: { score: 80, authenticReviews: 10, flagged: { reviewFarms: 0, botPatterns: 0, duplicates: 0, incentivized: 0 }, note: 'ok' },
  deals: { offers: [], lowestEver: null, currency: 'USD', history: [], dropProbability: 0.1, advice: 'wait' },
  alternatives: [],
  qa: [],
};

const item: ReviewItem = { id: 'r1', source: 'reddit', url: '#', text: 'good phone overall' };

describe('runPipeline', () => {
  it('parses, normalizes nulls, sets product and grounds reviewsAnalyzed in fetched count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(RAW) } }] }) }) as Response),
    );
    const v = await runPipeline('iPhone 17 Pro', { ...DEFAULT_SETTINGS, openaiKey: 'sk' }, [item], new AbortController().signal);
    expect(v.product).toBe('iPhone 17 Pro'); // overridden
    expect(v.category).toBeUndefined(); // null → undefined
    expect(v.reviewsAnalyzed).toBe(1); // grounded in fetched items, not the model's 999
    expect(v.decision).toBe('buy');
    expect(v.pros[0]?.label).toBe('Battery');
  });
});
