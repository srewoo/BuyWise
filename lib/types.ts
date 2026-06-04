import { z } from 'zod';

/** ───────────────────────── Source layer ───────────────────────── */
export const SourceKind = z.enum([
  'reddit',
  'youtube',
  'retail',
  'expert',
  'pricing',
]);
export type SourceKind = z.infer<typeof SourceKind>;

export const ReviewItem = z.object({
  id: z.string(),
  source: SourceKind,
  url: z.string(),
  author: z.string().optional(),
  title: z.string().optional(),
  text: z.string(),
  rating: z.number().min(0).max(5).optional(),
  score: z.number().optional(),
  publishedAt: z.string().optional(),
  verifiedPurchase: z.boolean().optional(),
});
export type ReviewItem = z.infer<typeof ReviewItem>;

export const PriceOffer = z.object({
  retailer: z.string(),
  price: z.number(),
  currency: z.string().default('USD'),
  url: z.string(),
  inStock: z.boolean().default(true),
  isLowest: z.boolean().optional(),
});
export type PriceOffer = z.infer<typeof PriceOffer>;

/** ───────────────────────── Verdict layer ──────────────────────── */
export const VerdictDecision = z.enum(['buy', 'consider', 'skip']);
export type VerdictDecision = z.infer<typeof VerdictDecision>;

export const Signal = z.object({
  label: z.string(),
  detail: z.string().optional(),
  /** 0..1 — how frequently / strongly this appears across sources */
  strength: z.number().min(0).max(1),
  mentions: z.number().int().optional(),
});
export type Signal = z.infer<typeof Signal>;

export const SourceSentiment = z.object({
  source: SourceKind,
  label: z.string(),
  positive: z.number().min(0).max(1),
  neutral: z.number().min(0).max(1),
  negative: z.number().min(0).max(1),
  sampleSize: z.number().int(),
  takeaway: z.string(),
});
export type SourceSentiment = z.infer<typeof SourceSentiment>;

export const TrustBreakdown = z.object({
  score: z.number().min(0).max(100),
  authenticReviews: z.number().int(),
  flagged: z.object({
    reviewFarms: z.number().int(),
    botPatterns: z.number().int(),
    duplicates: z.number().int(),
    incentivized: z.number().int(),
  }),
  note: z.string(),
});
export type TrustBreakdown = z.infer<typeof TrustBreakdown>;

export const PriceHistoryPoint = z.object({ t: z.string(), price: z.number() });
export const DealInfo = z.object({
  offers: z.array(PriceOffer),
  lowestEver: z.number().optional(),
  currency: z.string().default('USD'),
  history: z.array(PriceHistoryPoint),
  dropProbability: z.number().min(0).max(1),
  advice: z.string(),
});
export type DealInfo = z.infer<typeof DealInfo>;

export const Alternative = z.object({
  name: z.string(),
  angle: z.string(), // "Best camera", "Best value"…
  reason: z.string(),
  priceHint: z.string().optional(),
  decision: VerdictDecision,
});
export type Alternative = z.infer<typeof Alternative>;

export const QAItem = z.object({
  question: z.string(),
  answer: z.string(),
  citations: z.array(z.object({ source: SourceKind, label: z.string() })),
});
export type QAItem = z.infer<typeof QAItem>;

export const Verdict = z.object({
  product: z.string(),
  category: z.string().optional(),
  decision: VerdictDecision,
  confidence: z.number().min(0).max(1),
  oneLiner: z.string(),
  overview: z.string(),
  marketPosition: z.string(),
  reviewsAnalyzed: z.number().int(),
  pros: z.array(Signal),
  cons: z.array(Signal),
  community: z.array(SourceSentiment),
  trust: TrustBreakdown,
  deals: DealInfo,
  alternatives: z.array(Alternative),
  qa: z.array(QAItem),
  generatedAt: z.string(),
});
export type Verdict = z.infer<typeof Verdict>;

/** A real fetched source used to ground the verdict (for the citations list). */
export interface Citation {
  source: SourceKind;
  title: string;
  url: string;
}

export const AdviseRequest = z.object({
  query: z.string().min(1),
  deepResearch: z.boolean().default(false),
});
export type AdviseRequest = z.infer<typeof AdviseRequest>;

/** Visual metadata for each verdict decision (label, tone, tailwind tokens). */
export const VERDICT_META: Record<
  VerdictDecision,
  { label: string; text: string; bg: string; soft: string; ring: string }
> = {
  buy: { label: 'Buy', text: 'text-buy', bg: 'bg-buy', soft: 'bg-buy-soft', ring: 'stroke-buy' },
  consider: {
    label: 'Consider',
    text: 'text-consider',
    bg: 'bg-consider',
    soft: 'bg-consider-soft',
    ring: 'stroke-consider',
  },
  skip: { label: 'Skip', text: 'text-skip', bg: 'bg-skip', soft: 'bg-skip-soft', ring: 'stroke-skip' },
};
