import { describe, it, expect } from 'vitest';
import { computeTrust } from '@/lib/advisor/trust';
import type { ReviewItem } from '@/lib/types';

const mk = (over: Partial<ReviewItem>): ReviewItem => ({
  id: Math.random().toString(36),
  source: 'reddit',
  url: '#',
  text: 'This is a reasonably detailed and authentic-sounding review of the product over time.',
  ...over,
});

describe('computeTrust', () => {
  it('returns 0 with a clear note when there is no data', () => {
    const t = computeTrust([], 0);
    expect(t.score).toBe(0);
    expect(t.note).toMatch(/not enough/i);
  });

  it('rewards source diversity and volume', () => {
    const diverse = [
      ...Array.from({ length: 6 }, () => mk({ source: 'reddit' })),
      ...Array.from({ length: 6 }, () => mk({ source: 'youtube' })),
      ...Array.from({ length: 6 }, () => mk({ source: 'retail', rating: 4, verifiedPurchase: true })),
    ];
    const single = Array.from({ length: 6 }, () => mk({ source: 'reddit' }));
    expect(computeTrust(diverse, 0).score).toBeGreaterThan(computeTrust(single, 0).score);
  });

  it('penalises duplicates and flags incentivised reviews', () => {
    const items = [
      mk({ text: 'I received this product for free in exchange for an honest review, works great.' }),
      mk({ text: 'Sponsored unit, but genuinely a solid phone with great battery.' }),
      ...Array.from({ length: 6 }, () => mk({})),
    ];
    const clean = computeTrust(items, 0);
    const withDupes = computeTrust(items, 8);
    expect(clean.flagged.incentivized).toBeGreaterThanOrEqual(2);
    expect(withDupes.flagged.duplicates).toBe(8);
    expect(withDupes.score).toBeLessThan(clean.score); // duplicates drag the score down
  });

  it('penalises an unnatural 5-star skew', () => {
    const skewed = Array.from({ length: 12 }, () => mk({ source: 'retail', rating: 5 }));
    const natural = Array.from({ length: 12 }, (_, i) =>
      mk({ source: 'retail', rating: i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4 }),
    );
    expect(computeTrust(skewed, 0).score).toBeLessThan(computeTrust(natural, 0).score);
  });
});
