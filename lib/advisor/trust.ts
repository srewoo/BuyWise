import type { ReviewItem, TrustBreakdown } from '@/lib/types';

const INCENTIVIZED =
  /\b(received .{0,20}(for free|in exchange)|in exchange for|free product|gifted|sponsored|complimentary unit|for review purposes|sent .{0,15}to review)\b/i;

/**
 * Deterministic fake-review trust score computed from the ACTUAL fetched reviews —
 * not an LLM guess. Signals: source diversity, near-duplicate ratio, incentivised-language
 * keywords, rating skew, verified-purchase ratio, and low-content/repeated-author patterns.
 */
export function computeTrust(items: ReviewItem[], duplicatesRemoved: number): TrustBreakdown {
  const n = items.length;
  if (n === 0) {
    return {
      score: 0,
      authenticReviews: 0,
      flagged: { reviewFarms: 0, botPatterns: 0, duplicates: duplicatesRemoved, incentivized: 0 },
      note: 'Not enough fetched data to compute a trust score — add sources (e.g. a YouTube key) or open the product page.',
    };
  }

  const sources = new Set(items.map((i) => i.source));
  const diversity = sources.size; // 1..5

  const incentivized = items.filter((i) => INCENTIVIZED.test(i.text)).length;

  // repeated authors + ultra-low-content reviews → bot-ish patterns
  const authorCounts = new Map<string, number>();
  for (const i of items) if (i.author) authorCounts.set(i.author, (authorCounts.get(i.author) ?? 0) + 1);
  const repeatedAuthor = [...authorCounts.values()].filter((c) => c >= 3).reduce((a, b) => a + b, 0);
  const lowContent = items.filter((i) => i.text.replace(/\s+/g, ' ').trim().length < 60).length;
  const botPatterns = Math.min(n, Math.round(repeatedAuthor * 0.5 + lowContent * 0.3));

  // rating-distribution skew (only meaningful with enough rated reviews)
  const rated = items.filter((i) => typeof i.rating === 'number');
  const fiveStarRatio = rated.length ? rated.filter((i) => (i.rating ?? 0) >= 4.5).length / rated.length : 0;
  let skewPenalty = 0;
  let reviewFarms = 0;
  if (rated.length >= 8) {
    if (fiveStarRatio > 0.9) {
      skewPenalty = 14;
      reviewFarms = Math.round(rated.length * 0.15);
    } else if (fiveStarRatio > 0.8) {
      skewPenalty = 7;
    }
  }

  const verified = items.filter((i) => i.verifiedPurchase).length;
  const verifiedRatio = items.filter((i) => i.source === 'retail').length
    ? verified / items.filter((i) => i.source === 'retail').length
    : 0;

  const dupRatio = duplicatesRemoved / (n + duplicatesRemoved);
  const incentRatio = incentivized / n;

  let score = 45;
  score += Math.min(30, (diversity - 1) * 10); // diverse sources are harder to fake
  score += Math.min(15, n * 0.6); // volume
  score += Math.round(verifiedRatio * 10); // verified purchases
  score -= Math.round(dupRatio * 30);
  score -= Math.round(incentRatio * 20);
  score -= skewPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const parts = [
    `Computed from ${n} fetched source${n === 1 ? '' : 's'} across ${diversity} platform${diversity === 1 ? '' : 's'}`,
    `${duplicatesRemoved} near-duplicate${duplicatesRemoved === 1 ? '' : 's'} removed`,
    `${incentivized} with incentivised language`,
    rated.length ? `${Math.round(fiveStarRatio * 100)}% of rated reviews are 5★` : '',
  ].filter(Boolean);

  return {
    score,
    authenticReviews: Math.max(0, n - botPatterns - incentivized),
    flagged: { reviewFarms, botPatterns, duplicates: duplicatesRemoved, incentivized },
    note: `${parts.join(' · ')}.`,
  };
}
