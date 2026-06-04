import { Verdict } from '@/lib/types';
import type { Settings } from '@/lib/storage';
import type { ReviewItem } from '@/lib/types';
import { getRegion } from '@/lib/regions';
import { chatJSON } from './openai';
import { VERDICT_SCHEMA } from './schema';

const SYSTEM = `You are BuyWise, an expert, brutally honest product-buying advisor.
Given a product and (optionally) real reviews/discussions collected from Reddit and YouTube,
produce a single structured verdict.

Rules:
- decision is "buy", "consider", or "skip". confidence is 0..1.
- Ground every claim in the supplied evidence when present. If little/no evidence is supplied,
  use general knowledge but LOWER the confidence and say so in the overview.
- pros/cons: 3-6 each, ranked by how often/strongly they appear. strength is 0..1.
- community: one entry per source you actually have signal for (reddit/youtube/retail/expert);
  positive+neutral+negative must sum to ~1; sampleSize is your best estimate of how many opinions.
- trust: estimate authenticity 0..100 and a plausible breakdown of filtered low-trust reviews.
- deals: best-effort APPROXIMATE current prices by major retailer (USD) — these are estimates, say so
  in advice; include a short price history and a 0..1 dropProbability.
- alternatives: 2-3 with a distinct angle ("Best value", "Best camera", etc.).
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
  const grounding = settings.deepResearch
    ? 'DEEP RESEARCH MODE: base every pro, con, and community claim ONLY on the evidence below; do not invent reviews. If evidence is thin, lower confidence and say so.'
    : '';
  const prefs =
    settings.budgetMax || settings.brands.length
      ? `Buyer preferences — ${settings.budgetMax ? `budget up to ${region.currency} ${settings.budgetMax}` : 'no strict budget'}; prefers brands: ${settings.brands.length ? settings.brands.join(', ') : 'no preference'}. Weight value-for-money and these brands. If the product clearly exceeds the budget, lean toward "consider"/"skip" and prioritise a cheaper option in alternatives. Reflect this in the verdict and oneLiner.`
      : '';
  const user = `Product: ${product}
${pageContext ? `PAGE CONTEXT (authoritative): ${pageContext}\n` : ''}Market: ${region.name} — quote all prices in ${region.currency} and use only these retailers for deals: ${region.retailers.join(', ')}. ${pageContext ? '' : `If the product isn't sold in ${region.name}, say so and lean toward "skip".`}
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
