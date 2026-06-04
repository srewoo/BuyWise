import { describe, it, expect } from 'vitest';
import { computeSentiment } from '@/lib/advisor/sentiment';
import type { ReviewItem } from '@/lib/types';

const mk = (over: Partial<ReviewItem>): ReviewItem => ({
  id: Math.random().toString(36),
  source: 'reddit',
  url: '#',
  text: 'neutral text',
  ...over,
});

describe('computeSentiment', () => {
  it('uses star ratings for retail items', () => {
    const items = [
      mk({ source: 'retail', rating: 5 }),
      mk({ source: 'retail', rating: 5 }),
      mk({ source: 'retail', rating: 1 }),
    ];
    const [retail] = computeSentiment(items);
    expect(retail!.source).toBe('retail');
    expect(retail!.positive).toBeCloseTo(2 / 3, 2);
    expect(retail!.negative).toBeCloseTo(1 / 3, 2);
    expect(retail!.sampleSize).toBe(3);
  });

  it('uses lexicon for text without ratings', () => {
    const items = [
      mk({ text: 'I love this, excellent and reliable, highly recommend' }),
      mk({ text: 'terrible, broken, worst purchase, avoid' }),
      mk({ text: 'it is a product that exists' }),
    ];
    const [reddit] = computeSentiment(items);
    expect(reddit!.positive).toBeCloseTo(1 / 3, 2);
    expect(reddit!.negative).toBeCloseTo(1 / 3, 2);
  });

  it('groups by source and sorts by sample size', () => {
    const items = [
      mk({ source: 'reddit' }),
      mk({ source: 'youtube' }),
      mk({ source: 'youtube' }),
    ];
    const out = computeSentiment(items);
    expect(out[0]!.source).toBe('youtube'); // larger group first
    expect(out).toHaveLength(2);
  });
});
