import type { DealInfo } from '@/lib/types';
import { priceHistory, type PricePoint } from '@/lib/priceHistory';
import { assessDealTruth } from '@/lib/dealTruth';
import { storage } from '@/lib/storage';
import { notifyPriceDrop } from '@/lib/notify';

/**
 * Shared Deal-Finder builder. The ONE place that turns observed price points (from a store page
 * OR a price the user typed in — a shop tag, a showroom sticker, a site we don't auto-read) into
 * a grounded DealInfo. Never fabricates competitor prices; deal-truth comes from real history +
 * the claimed MRP only. Used by both the advisor pipeline and the manual "price you see" entry,
 * so in-store and non-Amazon purchases get the exact same honest deal-truth as online ones.
 */

const shortDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export interface DealInfoInput {
  /** Every price observed for this product (self-built history, current included). */
  points: PricePoint[];
  currency: string;
  /** Latest price to judge (page price or manually-entered price). Omit to only read history. */
  current?: number;
  /** Store's struck-through "original"/MRP price, if known — powers fake-discount detection. */
  listPrice?: number;
  /** Seller name shown on the offer row (retailer, dealership, store, or "Price you entered"). */
  retailer: string;
  url?: string;
  /** Advice shown when there is no price data at all. */
  emptyAdvice: string;
}

export function buildDealInfo(input: DealInfoInput): DealInfo {
  const { points, currency, current: rawCurrent, listPrice, retailer, url, emptyAdvice } = input;

  if (!points.length) {
    return { offers: [], currency, history: [], dropProbability: 0, advice: emptyAdvice };
  }

  const current = rawCurrent ?? points[points.length - 1]!.price;
  const lowest = Math.min(...points.map((p) => p.price));
  const offers =
    rawCurrent != null
      ? [{ retailer, price: current, currency, url: url ?? '#', inStock: true, isLowest: current <= lowest }]
      : [];
  const dropProbability = lowest > 0 && current > lowest ? Math.min(0.7, (current - lowest) / current) : 0.05;
  const advice =
    current <= lowest
      ? `This is the lowest price you've tracked (${currency} ${current.toLocaleString()}).`
      : `${currency} ${current.toLocaleString()} now — ${currency} ${(current - lowest).toLocaleString()} above your lowest tracked price (${currency} ${lowest.toLocaleString()}). History is built from your own visits.`;

  // The "is this sale fake?" verdict — grounded in observed history + the page's/store's claimed MRP.
  const dealTruth = assessDealTruth(current, points, listPrice, currency);

  return {
    offers,
    currency,
    history: points.map((p) => ({ t: shortDate(p.t), price: p.price })),
    lowestEver: lowest,
    dropProbability,
    advice,
    dealTruth,
  };
}

/**
 * Record a price the user is looking at right now (in-store tag, showroom sticker, or any site
 * BuyWise doesn't auto-read) and return a fresh, grounded DealInfo including a deal-truth verdict.
 * This is what lets BuyWise research ANY retail purchase, not just online electronics.
 */
export async function recordManualPrice(input: {
  product: string;
  amount: number;
  currency: string;
  listPrice?: number;
  retailer?: string;
}): Promise<DealInfo> {
  const tracked = await priceHistory.record(input.product, input.amount, input.currency);
  // A manually-logged price is a real observation — let it satisfy any standing price alert.
  const triggered = await storage.checkAlerts(input.product, input.amount, tracked.currency);
  if (triggered) notifyPriceDrop(triggered);
  return buildDealInfo({
    points: tracked.points,
    currency: tracked.currency,
    current: input.amount,
    listPrice: input.listPrice,
    retailer: input.retailer?.trim() || 'Price you entered',
    emptyAdvice: '',
  });
}
