import type { PricePoint } from '@/lib/priceHistory';

/**
 * Deal-truth detection — the honest core of BuyWise.
 *
 * Indian e-commerce "deals" are notoriously fake: the strike-through MRP is jacked up so a
 * routine price looks like "50% off". We catch that using only data we can stand behind:
 *   1. the prices BuyWise actually observed on this product (self-built history), and
 *   2. the store's own claimed "original price" (the struck-through MRP on the page).
 *
 * We never fabricate a baseline. If we don't have enough observations to judge, we say so.
 */
export type DealTruthStatus = 'real' | 'inflated' | 'unverified';

export interface DealTruthResult {
  status: DealTruthStatus;
  /** Discount the store claims off its struck-through MRP, if shown. */
  claimedDiscountPct?: number;
  /** Discount vs the typical price BuyWise actually observed. */
  realDiscountPct?: number;
  /** Lowest price BuyWise ever recorded for this product. */
  trueLow?: number;
  /** ISO timestamp of when that low was seen. */
  trueLowAt?: string;
  message: string;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

const pct = (from: number, to: number): number =>
  from > 0 ? Math.round(((from - to) / from) * 100) : 0;

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const money = (n: number, currency: string): string =>
  `${currency} ${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Classify the current price against observed history + the store's claimed MRP.
 *
 * @param current      Price shown on the page right now.
 * @param observed     Every price BuyWise has recorded for this product (current included).
 * @param claimedList  The struck-through "original"/MRP price the store displays, if any.
 * @param currency     Currency code for messages.
 */
export function assessDealTruth(
  current: number,
  observed: PricePoint[],
  claimedList: number | undefined,
  currency: string,
): DealTruthResult {
  const prices = observed.map((p) => p.price).filter((n) => n > 0);
  const claimed = claimedList && claimedList > current ? claimedList : undefined;
  const claimedDiscountPct = claimed ? pct(claimed, current) : undefined;

  // Need at least two observations OR a claimed MRP to say anything honest.
  if (prices.length < 2 && claimed == null) {
    return {
      status: 'unverified',
      message:
        "Not enough price history yet. Revisit this product over the next few days and BuyWise will start telling you whether a discount is genuine.",
    };
  }

  const trueLow = prices.length ? Math.min(...prices) : current;
  const lowPoint = observed.find((p) => p.price === trueLow);
  const observedMax = prices.length ? Math.max(...prices) : current;
  const typical = prices.length ? median(prices) : current;
  const realDiscountPct = pct(typical, current);

  // Signal 1 (strongest): the store's "original price" is above anything this product has
  // actually sold for in our tracking → the discount is manufactured.
  if (claimed != null && claimed > observedMax * 1.05) {
    return {
      status: 'inflated',
      claimedDiscountPct,
      realDiscountPct,
      trueLow,
      trueLowAt: lowPoint?.t,
      message: `Inflated "${claimedDiscountPct}% off". The ${money(
        claimed,
        currency,
      )} original price is higher than this ever sold for in our tracking (max ${money(
        observedMax,
        currency,
      )}). Real saving vs its usual price is about ${Math.max(0, realDiscountPct)}%.`,
    };
  }

  // Signal 2: it was genuinely cheaper before — wait, this "sale" isn't the good one.
  if (prices.length >= 2 && current > trueLow * 1.02) {
    return {
      status: 'inflated',
      claimedDiscountPct,
      realDiscountPct,
      trueLow,
      trueLowAt: lowPoint?.t,
      message: `Wait — not the best price. It was ${money(trueLow, currency)}${
        lowPoint ? ` on ${fmtDate(lowPoint.t)}` : ''
      }, which is ${money(current - trueLow, currency)} less than now.`,
    };
  }

  // Signal 3: current is at/near the real low → a genuine deal.
  return {
    status: 'real',
    claimedDiscountPct,
    realDiscountPct,
    trueLow,
    trueLowAt: lowPoint?.t,
    message:
      prices.length >= 2
        ? `Genuine deal — this is at or near the lowest price BuyWise has tracked (${money(trueLow, currency)}).`
        : `${money(current, currency)} now. Keep tracking to confirm how good this price really is.`,
  };
}
