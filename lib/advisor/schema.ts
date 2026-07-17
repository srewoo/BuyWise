/** Strict JSON schema for OpenAI Structured Outputs — mirrors the Verdict Zod type.
 * Strict mode: every property must be listed in `required` and additionalProperties:false.
 * Optional fields are expressed as nullable (["string","null"]) rather than omitted. */

const str = { type: 'string' } as const;
const num = { type: 'number' } as const;
const int = { type: 'integer' } as const;
const strNull = { type: ['string', 'null'] } as const;
const intNull = { type: ['integer', 'null'] } as const;

const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const arr = (items: unknown) => ({ type: 'array', items });

const signal = obj({ label: str, detail: strNull, strength: num, mentions: intNull });
const keyFact = obj({
  label: str,
  value: str,
  sentiment: { type: ['string', 'null'], enum: ['positive', 'neutral', 'negative', null] },
});
const sentiment = obj({
  source: { type: 'string', enum: ['reddit', 'youtube', 'retail', 'expert'] },
  label: str,
  positive: num,
  neutral: num,
  negative: num,
  sampleSize: int,
  takeaway: str,
});
const citation = obj({
  source: { type: 'string', enum: ['reddit', 'youtube', 'retail', 'expert', 'pricing'] },
  label: str,
});
const offer = obj({ retailer: str, price: num, currency: str, url: str, inStock: { type: 'boolean' }, isLowest: { type: 'boolean' } });
const historyPoint = obj({ t: str, price: num });
const deals = obj({
  offers: arr(offer),
  lowestEver: { type: ['number', 'null'] },
  currency: str,
  history: arr(historyPoint),
  dropProbability: num,
  advice: str,
});
const alternative = obj({
  name: str,
  angle: str,
  reason: str,
  priceHint: strNull,
  decision: { type: 'string', enum: ['buy', 'consider', 'skip'] },
});
const qa = obj({ question: str, answer: str, citations: arr(citation) });
const trust = obj({
  score: num,
  authenticReviews: int,
  flagged: obj({ reviewFarms: int, botPatterns: int, duplicates: int, incentivized: int }),
  note: str,
});

export const VERDICT_SCHEMA = obj({
  product: str,
  category: strNull,
  decision: { type: 'string', enum: ['buy', 'consider', 'skip'] },
  confidence: num,
  oneLiner: str,
  overview: str,
  marketPosition: str,
  reviewsAnalyzed: int,
  keyFacts: arr(keyFact),
  pros: arr(signal),
  cons: arr(signal),
  community: arr(sentiment),
  trust,
  deals,
  alternatives: arr(alternative),
  qa: arr(qa),
});
