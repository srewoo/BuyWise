import { describe, it, expect } from 'vitest';
import { buildDealInfo, recordManualPrice } from '@/lib/advisor/dealInfo';
import type { PricePoint } from '@/lib/priceHistory';

const pts = (...prices: number[]): PricePoint[] =>
  prices.map((price, i) => ({ t: `2026-07-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, price }));

describe('buildDealInfo', () => {
  it('returns the empty advice when there is no price data', () => {
    const d = buildDealInfo({ points: [], currency: 'USD', retailer: 'x', emptyAdvice: 'log a price' });
    expect(d.offers).toEqual([]);
    expect(d.history).toEqual([]);
    expect(d.advice).toBe('log a price');
    expect(d.dealTruth).toBeUndefined();
  });

  it('creates a single grounded offer from the entered/observed current price', () => {
    const d = buildDealInfo({
      points: pts(500),
      currency: 'INR',
      current: 500,
      retailer: 'Price you entered',
      emptyAdvice: '',
    });
    expect(d.offers).toHaveLength(1);
    expect(d.offers[0]).toMatchObject({ retailer: 'Price you entered', price: 500, currency: 'INR' });
    expect(d.lowestEver).toBe(500);
    expect(d.dealTruth).toBeDefined();
  });

  it('flags an inflated MRP as a fake discount (channel-independent deal-truth)', () => {
    // Observed 100–110, but the store claims a 300 "original" → manufactured discount.
    const d = buildDealInfo({
      points: pts(100, 110, 105),
      currency: 'USD',
      current: 105,
      listPrice: 300,
      retailer: 'Store',
      emptyAdvice: '',
    });
    expect(d.dealTruth?.status).toBe('inflated');
  });

  it('does not create an offer when only reading history (no current price)', () => {
    const d = buildDealInfo({ points: pts(200, 180), currency: 'USD', retailer: 'x', emptyAdvice: '' });
    expect(d.offers).toEqual([]);
    expect(d.lowestEver).toBe(180);
  });
});

describe('recordManualPrice', () => {
  it('records the price and returns a grounded DealInfo with an offer', async () => {
    const d = await recordManualPrice({
      product: 'Test Sofa ' + Math.random().toString(36).slice(2),
      amount: 42990,
      currency: 'INR',
    });
    expect(d.offers).toHaveLength(1);
    expect(d.offers[0]!.price).toBe(42990);
    expect(d.currency).toBe('INR');
    expect(d.dealTruth).toBeDefined();
  });

  it('accepts a claimed MRP and surfaces a deal-truth verdict', async () => {
    const d = await recordManualPrice({
      product: 'Test Drink ' + Math.random().toString(36).slice(2),
      amount: 40,
      currency: 'INR',
      listPrice: 60,
    });
    expect(d.dealTruth?.claimedDiscountPct).toBe(33); // (60-40)/60 ≈ 33%
  });
});
