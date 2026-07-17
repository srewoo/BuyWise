import { Verdict } from '@/lib/types';
import type { Settings } from '@/lib/storage';
import type { ReviewItem } from '@/lib/types';
import { getRegion } from '@/lib/regions';
import { classifyCategory } from '@/lib/categories';
import { chatJSON } from './openai';
import { VERDICT_SCHEMA } from './schema';

const SYSTEM = `You are BuyWise, an expert, brutally honest purchase-research advisor.
You research ANY retail purchase a person can make in the public domain — not just online electronics.
That includes phones, laptops, TVs, headphones and gadgets, but equally cars and vehicles, clothing,
footwear, watches and accessories, home appliances, furniture, kitchenware, beauty and personal-care,
groceries, packaged food and beverages (down to a cold drink), toys, sports gear, tools, and more —
whether bought online OR in a physical store/showroom/dealership.
Given a product and (optionally) real reviews/discussions collected from the web and communities,
produce a single structured verdict.

Rules:
- First infer the product's CATEGORY and set the "category" field. Let the category shape everything
  below — the questions a buyer asks about a car (resale value, mileage, service cost, on-road price)
  differ from a laptop (performance, battery, ports), a cold drink (taste, sugar, price-per-litre),
  a pair of shoes (fit, durability, comfort), or a sofa (build, fabric, warranty). Judge each product
  on the criteria that actually matter for ITS category.
- keyFacts: 4-6 category-tuned quick facts a buyer actually weighs, each a short label + concrete
  value (+ optional sentiment). Use the SUGGESTED FIELDS for the category as your guide, filling the
  value from the evidence/knowledge (say "Unknown" if genuinely unavailable). This is where a car
  shows mileage/resale/service cost and a shoe shows fit/durability — structured, not buried in prose.
- decision is "buy", "consider", or "skip". confidence is 0..1.
- Ground every claim in the supplied evidence when present. If little/no evidence is supplied,
  use general knowledge but LOWER the confidence and say so in the overview.
- pros/cons: 3-6 each, ranked by how often/strongly they appear. strength is 0..1.
- community: one entry per source you actually have signal for (reddit/youtube/retail/expert);
  positive+neutral+negative must sum to ~1; sampleSize is your best estimate of how many opinions.
- trust: estimate authenticity 0..100 and a plausible breakdown of filtered low-trust reviews.
- deals: best-effort APPROXIMATE current price in the buyer's currency, using the price form that fits
  the category — a sticker/on-road price for a car, MRP or per-unit/per-litre price for groceries and
  beverages, typical store/online price for apparel, electronics, or appliances. Name whichever sellers
  are realistic for the category (dealerships, brand stores, supermarkets, or online marketplaces — not
  only electronics retailers). These are estimates, say so in advice; include a short price history and
  a 0..1 dropProbability.
- alternatives: 2-3 with a distinct angle chosen for the category ("Best value", "Cheaper rival",
  "More premium", "Best fuel economy", "Better fit", "Healthier option", etc.).
- qa: 2-4 common buyer questions answered from the evidence, each citing the sources used.
Be concise and specific. No marketing fluff.`;

function buildEvidence(items: ReviewItem[], cap = 40): string {
  if (!items.length) return '(No live reviews were collected — base the verdict on general knowledge.)';
  const top = items.slice(0, cap);
  return top
    .map((it, i) => {
      const meta = [it.source, it.rating != null ? `${it.rating}★` : null, it.score != null ? `score ${it.score}` : null]
        .filter(Boolean)
        .join(' · ');
      return `[${i + 1}] (${meta}) ${it.text.replace(/\s+/g, ' ').slice(0, 400)}`;
    })
    .join('\n');
}

type Raw = Record<string, unknown>;

/** Recursively convert nulls (from the JSON-schema nullable fields) to undefined for Zod. */
function nullsToUndefined<T>(value: T): T {
  if (value === null) return undefined as unknown as T;
  if (Array.isArray(value)) return value.map(nullsToUndefined) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = nullsToUndefined(v);
    return out as T;
  }
  return value;
}

export async function runPipeline(
  product: string,
  settings: Settings,
  items: ReviewItem[],
  signal: AbortSignal,
  pageContext = '',
): Promise<Verdict> {
  const region = getRegion(settings.region);
  const category = classifyCategory(product);
  const grounding = settings.deepResearch
    ? 'DEEP RESEARCH MODE: base every pro, con, and community claim ONLY on the evidence below; do not invent reviews. If evidence is thin, lower confidence and say so.'
    : '';
  const prefs =
    settings.budgetMax || settings.brands.length
      ? `Buyer preferences — ${settings.budgetMax ? `budget up to ${region.currency} ${settings.budgetMax}` : 'no strict budget'}; prefers brands: ${settings.brands.length ? settings.brands.join(', ') : 'no preference'}. Weight value-for-money and these brands. If the product clearly exceeds the budget, lean toward "consider"/"skip" and prioritise a cheaper option in alternatives. Reflect this in the verdict and oneLiner.`
      : '';
  const user = `Product: ${product}
Likely category: ${category.label}. SUGGESTED FIELDS for keyFacts (adapt as needed): ${category.keyFactLabels.join(', ')}.
${pageContext ? `PAGE CONTEXT (authoritative): ${pageContext}\n` : ''}Market: ${region.name} — quote all prices in ${region.currency}. For deals, name whichever sellers are realistic for this product's category (e.g. ${region.retailers.join(', ')}, plus dealerships, brand outlets, supermarkets, or specialist stores as appropriate). ${pageContext ? '' : `If the product genuinely isn't sold or available in ${region.name}, say so and lean toward "skip".`}
Deep research: ${settings.deepResearch ? 'yes' : 'no'}
${grounding}
${prefs}

EVIDENCE (${items.length} fetched sources):
${buildEvidence(items, settings.deepResearch ? 55 : 40)}`;

  const raw = await chatJSON<Raw>({
    apiKey: settings.openaiKey,
    model: settings.model || 'gpt-5',
    system: SYSTEM,
    user,
    schema: VERDICT_SCHEMA,
    schemaName: 'verdict',
    signal,
    maxTokens: settings.deepResearch ? 6000 : 4000,
  });

  const cleaned = nullsToUndefined(raw) as Raw;
  // ground the displayed review count in what we actually fetched (when we fetched anything)
  if (items.length) cleaned.reviewsAnalyzed = items.length;
  cleaned.product = product;
  cleaned.generatedAt = new Date().toISOString();

  return Verdict.parse(cleaned);
}
