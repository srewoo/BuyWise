import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAdvisor } from '@/lib/advisor';
import { storage } from '@/lib/storage';

afterEach(() => vi.unstubAllGlobals());

const RAW = {
  product: 'placeholder',
  category: 'Phone',
  decision: 'consider',
  confidence: 0.6,
  oneLiner: 'Decent.',
  overview: 'A capable phone.',
  marketPosition: 'Flagship',
  reviewsAnalyzed: 500,
  pros: [{ label: 'Camera', detail: null, strength: 0.8, mentions: null }],
  cons: [{ label: 'Price', detail: null, strength: 0.6, mentions: null }],
  community: [{ source: 'reddit', label: 'LLM guess', positive: 0.5, neutral: 0.3, negative: 0.2, sampleSize: 9, takeaway: 'x' }],
  trust: { score: 50, authenticReviews: 5, flagged: { reviewFarms: 0, botPatterns: 0, duplicates: 0, incentivized: 0 }, note: 'llm note' },
  deals: { offers: [{ retailer: 'Made Up', price: 1, currency: 'USD', url: '#', inStock: true, isLowest: true }], lowestEver: null, currency: 'USD', history: [], dropProbability: 0.2, advice: 'llm' },
  alternatives: [],
  qa: [],
};

const json = (b: unknown) => ({ ok: true, status: 200, json: async () => b }) as Response;
const redditBody = {
  data: { children: [{ data: { id: 'p1', title: 'phone review', selftext: 'great camera and battery, used for months and love it', permalink: '/r/x/p1', score: 60 } }] },
};

function liveFetch() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('reddit.com')) return json(redditBody);
    if (u.includes('/v1/chat/completions')) return json({ choices: [{ message: { content: JSON.stringify(RAW) } }] });
    return { ok: false, status: 404 } as Response;
  });
}

beforeEach(async () => {
  await storage.saveSettings({ openaiKey: '', deepResearch: false, youtubeKey: '', region: 'US' });
});

describe('runAdvisor', () => {
  it('returns a clearly-labeled sample in demo mode (no key) without hitting the network', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const r = await runAdvisor('Demo Product One');
    expect(r.mode).toBe('demo');
    expect(r.grounded).toBe(false);
    expect(r.verdict.product).toBe('Demo Product One');
    expect(r.verdict.oneLiner).toMatch(/key/i);
    expect(f).not.toHaveBeenCalled();
  });

  it('runs live: grounds in fetched reviews and overrides trust + sentiment + deals', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal('fetch', liveFetch());
    const r = await runAdvisor('Live Product Two');
    expect(r.mode).toBe('live');
    expect(r.grounded).toBe(true);
    expect(r.verdict.trust.note).toMatch(/computed from/i); // real, not "llm note"
    expect(r.verdict.community.length).toBeGreaterThan(0); // computed from corpus
    expect(r.verdict.deals.offers).toHaveLength(0); // no page price → no fabricated offers
    expect(r.verdict.deals.advice).toMatch(/no live price/i);
  });

  it('uses the on-page price for real deals and bypasses cache', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal('fetch', liveFetch());
    const r = await runAdvisor('OnPage Product Three', () => {}, new AbortController().signal, {
      pagePrice: { amount: 399, currency: 'USD' },
      retailer: 'Amazon',
      pageUrl: 'https://amazon.com/x',
      seedReviews: [{ text: 'genuinely great, used it daily for weeks', verified: true }],
    });
    expect(r.verdict.deals.offers[0]?.price).toBe(399);
    expect(r.coverage.some((c) => c.source === 'retail')).toBe(true); // on-page reviews counted
  });

  it('flags an inflated claimed MRP as a fake deal', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal('fetch', liveFetch());
    // First visit seeds history at 1000; current page claims ₹3000 "original" at 1000 → fake.
    await runAdvisor('Inflated MRP Phone', () => {}, new AbortController().signal, {
      pagePrice: { amount: 1000, currency: 'INR' },
    });
    const r = await runAdvisor('Inflated MRP Phone', () => {}, new AbortController().signal, {
      pagePrice: { amount: 1000, currency: 'INR' },
      pageListPrice: 3000,
    });
    expect(r.verdict.deals.dealTruth?.status).toBe('inflated');
    expect(r.verdict.deals.dealTruth?.claimedDiscountPct).toBe(67);
  });

  it('serves a cached verdict on the second run (no page data)', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal('fetch', liveFetch());
    await runAdvisor('Cacheable Product Four'); // populates cache
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('should not fetch on cache hit');
      }),
    );
    const r = await runAdvisor('Cacheable Product Four');
    expect(r.mode).toBe('cached');
  });
});
