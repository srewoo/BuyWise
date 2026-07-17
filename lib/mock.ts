import type { Verdict } from '@/lib/types';

/**
 * A clearly-labeled placeholder verdict for the real product, used in demo mode (no OpenAI key).
 * It must NOT impersonate a real analysis — every field tells the user to add a key.
 */
export function sampleVerdict(product: string): Verdict {
  return {
    product,
    category: 'Demo mode — not a real analysis',
    decision: 'consider',
    confidence: 0,
    oneLiner: `Add your OpenAI key in Settings to get a real verdict for ${product}.`,
    overview: `BuyWise is in demo mode because no OpenAI key is set, so this is a placeholder — not a real analysis of ${product}. Add your key in Settings and BuyWise will research it live from Reddit, YouTube, and the reviews on the page you're viewing.`,
    marketPosition: 'Add an OpenAI key to analyze this product',
    reviewsAnalyzed: 0,
    keyFacts: [],
    pros: [{ label: 'Real pros appear here once you add your OpenAI key', strength: 0 }],
    cons: [{ label: 'Real cons appear here once you add your OpenAI key', strength: 0 }],
    community: [],
    trust: {
      score: 0,
      authenticReviews: 0,
      flagged: { reviewFarms: 0, botPatterns: 0, duplicates: 0, incentivized: 0 },
      note: 'Add your OpenAI key for a real fake-review trust analysis.',
    },
    deals: {
      offers: [],
      currency: 'USD',
      history: [],
      dropProbability: 0,
      advice: 'Add your OpenAI key to find live deals for this product.',
    },
    alternatives: [],
    qa: [],
    generatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  };
}

/** Seeded demo verdict — renders the full UI without any API keys. */
export const DEMO_VERDICT: Verdict = {
  product: 'Sony WH-1000XM6',
  category: 'Wireless noise-cancelling headphones',
  decision: 'buy',
  confidence: 0.92,
  oneLiner: 'Best-in-class noise cancelling and sound — the clear pick if budget allows.',
  overview:
    'Sony’s flagship over-ear headphones refine an already class-leading formula: adaptive ANC, a warmer tuned sound signature, and all-day comfort. Owners and reviewers broadly agree it sets the 2025 benchmark.',
  marketPosition: 'Premium tier · competes with Bose QC Ultra and AirPods Max',
  reviewsAnalyzed: 1284,
  keyFacts: [
    { label: 'Price', value: '$399 (launch)', sentiment: 'neutral' },
    { label: 'Noise cancellation', value: 'Class-leading', sentiment: 'positive' },
    { label: 'Sound quality', value: 'Warm, balanced', sentiment: 'positive' },
    { label: 'Comfort & fit', value: 'All-day comfortable', sentiment: 'positive' },
    { label: 'Battery life', value: '~30h (ANC on)', sentiment: 'positive' },
    { label: 'Call quality', value: 'Excellent', sentiment: 'positive' },
  ],
  pros: [
    { label: 'Class-leading noise cancellation', strength: 0.96, mentions: 412 },
    { label: 'Rich, balanced sound signature', strength: 0.89, mentions: 358 },
    { label: 'Comfortable for long sessions', strength: 0.83, mentions: 240 },
    { label: 'Excellent call quality', strength: 0.71, mentions: 154 },
    { label: 'Multipoint Bluetooth is reliable', strength: 0.64, mentions: 121 },
  ],
  cons: [
    { label: 'Expensive vs. competitors', strength: 0.78, mentions: 198 },
    { label: 'No major design change', strength: 0.52, mentions: 96 },
    { label: 'Case is bulky for pockets', strength: 0.39, mentions: 61 },
  ],
  community: [
    {
      source: 'reddit',
      label: 'r/headphones enthusiasts',
      positive: 0.81,
      neutral: 0.12,
      negative: 0.07,
      sampleSize: 340,
      takeaway: 'Enthusiasts call ANC a generational leap; a few prefer the XM5 tuning.',
    },
    {
      source: 'youtube',
      label: 'Reviewer consensus',
      positive: 0.88,
      neutral: 0.08,
      negative: 0.04,
      sampleSize: 47,
      takeaway: 'Near-unanimous “best ANC you can buy” across major tech channels.',
    },
    {
      source: 'retail',
      label: 'Verified buyers',
      positive: 0.86,
      neutral: 0.09,
      negative: 0.05,
      sampleSize: 842,
      takeaway: 'High satisfaction; complaints cluster around price, not quality.',
    },
    {
      source: 'expert',
      label: 'Publications',
      positive: 0.9,
      neutral: 0.07,
      negative: 0.03,
      sampleSize: 18,
      takeaway: 'Editor’s Choice at most outlets; docked only on value.',
    },
  ],
  trust: {
    score: 88,
    authenticReviews: 1126,
    flagged: { reviewFarms: 38, botPatterns: 52, duplicates: 47, incentivized: 21 },
    note: '88/100 — review set is highly authentic. ~12% filtered as low-trust before analysis.',
  },
  deals: {
    currency: 'USD',
    lowestEver: 348,
    dropProbability: 0.34,
    advice: 'Fair price now. A ~10% drop is likely around the next sale event — wait if not urgent.',
    offers: [
      { retailer: 'Amazon', price: 399, currency: 'USD', url: '#', inStock: true, isLowest: true },
      { retailer: 'Best Buy', price: 409, currency: 'USD', url: '#', inStock: true },
      { retailer: 'Walmart', price: 418, currency: 'USD', url: '#', inStock: true },
      { retailer: 'Sony', price: 429, currency: 'USD', url: '#', inStock: true },
    ],
    history: [
      { t: 'Jan', price: 449 },
      { t: 'Feb', price: 449 },
      { t: 'Mar', price: 429 },
      { t: 'Apr', price: 399 },
      { t: 'May', price: 419 },
      { t: 'Jun', price: 399 },
    ],
  },
  alternatives: [
    {
      name: 'Bose QC Ultra',
      angle: 'Best comfort',
      reason: 'Lighter clamp and plusher pads for marathon listening; ANC nearly as good.',
      priceHint: '~$379',
      decision: 'consider',
    },
    {
      name: 'Sony WH-1000XM5',
      angle: 'Best value',
      reason: 'Last-gen flagship at a discount — 90% of the experience for less money.',
      priceHint: '~$298',
      decision: 'buy',
    },
    {
      name: 'AirPods Max (USB-C)',
      angle: 'Best for Apple',
      reason: 'Seamless Apple ecosystem and spatial audio, but heavier and pricier.',
      priceHint: '~$549',
      decision: 'consider',
    },
  ],
  qa: [
    {
      question: 'Does it overheat or get uncomfortable on long flights?',
      answer:
        'No overheating reported. Most long-haul travelers find them comfortable for 4–6 hours; a minority with larger heads note mild clamp after hour five.',
      citations: [
        { source: 'reddit', label: 'r/headphones flight threads' },
        { source: 'retail', label: '120+ verified-buyer reviews' },
      ],
    },
    {
      question: 'Is it worth upgrading from the XM5?',
      answer:
        'Only if ANC and call quality matter to you — those are the real gains. Sound is a subtle refinement. Most XM5 owners say it’s a “nice-to-have,” not essential.',
      citations: [
        { source: 'youtube', label: '6 comparison reviews' },
        { source: 'expert', label: 'RTINGS A/B test' },
      ],
    },
  ],
  generatedAt: new Date('2026-06-04T10:00:00Z').toISOString(),
};
