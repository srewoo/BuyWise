import { describe, it, expect } from 'vitest';
import { assessDealTruth } from '@/lib/dealTruth';
import type { PricePoint } from '@/lib/priceHistory';

const pts = (...prices: number[]): PricePoint[] =>
  prices.map((price, i) => ({ t: `2026-05-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, price }));

describe('assessDealTruth', () => {
  it('is unverified with no history and no claimed MRP', () => {
    const r = assessDealTruth(1000, pts(1000), undefined, 'INR');
    expect(r.status).toBe('unverified');
    expect(r.message).toMatch(/not enough/i);
  });

  it('flags an inflated MRP that exceeds anything ever observed', () => {
    // Always sold ~1000, but the page claims ₹3000 "original" → fake 50% off at 1500.
    const r = assessDealTruth(1500, pts(1000, 1000, 950), 3000, 'INR');
    expect(r.status).toBe('inflated');
    expect(r.claimedDiscountPct).toBe(50);
    expect(r.message).toMatch(/inflated/i);
  });

  it('warns when it was genuinely cheaper before', () => {
    const r = assessDealTruth(1200, pts(900, 1000, 1200), undefined, 'INR');
    expect(r.status).toBe('inflated');
    expect(r.trueLow).toBe(900);
    expect(r.message).toMatch(/was ₹|wait/i);
  });

  it('confirms a genuine deal at/near the real low', () => {
    const r = assessDealTruth(900, pts(1200, 1000, 900), 1000, 'INR');
    expect(r.status).toBe('real');
    expect(r.trueLow).toBe(900);
    expect(r.message).toMatch(/genuine/i);
  });

  it('ignores a claimed MRP that is below the current price', () => {
    const r = assessDealTruth(1000, pts(1000, 1000), 800, 'INR');
    expect(r.claimedDiscountPct).toBeUndefined();
  });
});
