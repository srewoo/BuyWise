import { describe, it, expect } from 'vitest';
import { priceHistory } from '@/lib/priceHistory';

describe('priceHistory', () => {
  it('returns null for an untracked product', async () => {
    expect(await priceHistory.get('never-tracked-abc')).toBeNull();
  });

  it('records a price and reads it back', async () => {
    await priceHistory.record('Widget A', 499, 'INR');
    const t = await priceHistory.get('  widget a ');
    expect(t?.currency).toBe('INR');
    expect(t?.points.at(-1)?.price).toBe(499);
  });

  it('keeps one point per day (latest wins)', async () => {
    await priceHistory.record('Widget B', 100, 'USD');
    await priceHistory.record('Widget B', 90, 'USD');
    const t = await priceHistory.get('Widget B');
    expect(t?.points).toHaveLength(1);
    expect(t?.points[0]?.price).toBe(90);
  });
});
