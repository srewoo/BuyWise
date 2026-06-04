import type { ReviewItem, SourceSentiment, SourceKind } from '@/lib/types';

const POS =
  /\b(love|loved|great|excellent|amazing|awesome|best|perfect|recommend|worth|impressive|solid|fantastic|good|happy|satisfied|reliable|smooth|premium|superb|flawless|excels?)\b/gi;
const NEG =
  /\b(bad|poor|terrible|worst|disappointing|disappointed|issue|issues|problem|problems|defective|broken|overpriced|expensive|slow|laggy|avoid|regret|faulty|cheap|overheat|overheats|return(ed)?|stopped working|waste|buggy)\b/gi;

const LABEL: Record<SourceKind, string> = {
  reddit: 'Reddit discussions',
  youtube: 'YouTube reviewers',
  retail: 'On-page buyers',
  expert: 'Expert reviews',
  pricing: 'Pricing',
};

type Polarity = 'pos' | 'neu' | 'neg';

function classify(it: ReviewItem): Polarity {
  if (typeof it.rating === 'number') {
    if (it.rating >= 4) return 'pos';
    if (it.rating <= 2.5) return 'neg';
    return 'neu';
  }
  const pos = (it.text.match(POS) ?? []).length;
  const neg = (it.text.match(NEG) ?? []).length;
  if (pos > neg) return 'pos';
  if (neg > pos) return 'neg';
  return 'neu';
}

/**
 * Deterministic sentiment computed from the fetched corpus (star ratings where present,
 * else a lightweight lexicon). Replaces LLM-guessed splits. Heuristic but data-derived.
 */
export function computeSentiment(items: ReviewItem[]): SourceSentiment[] {
  const groups = new Map<SourceKind, ReviewItem[]>();
  for (const it of items) {
    if (!groups.has(it.source)) groups.set(it.source, []);
    groups.get(it.source)!.push(it);
  }

  const out: SourceSentiment[] = [];
  for (const [source, group] of groups) {
    if (source === 'pricing' || group.length === 0) continue;
    let p = 0;
    let nu = 0;
    let ng = 0;
    for (const it of group) {
      const c = classify(it);
      if (c === 'pos') p++;
      else if (c === 'neg') ng++;
      else nu++;
    }
    const n = group.length;
    const positive = p / n;
    const negative = ng / n;
    const neutral = nu / n;
    const pct = Math.round(positive * 100);
    const takeaway =
      pct >= 75
        ? `Largely positive — ${pct}% favourable across ${n} ${LABEL[source].toLowerCase()}.`
        : pct >= 50
          ? `Mostly positive (${pct}%) with some complaints, from ${n} sources.`
          : pct >= 30
            ? `Mixed — only ${pct}% favourable across ${n} sources.`
            : `Mostly negative — ${pct}% favourable across ${n} sources.`;
    out.push({ source, label: LABEL[source], positive, neutral, negative, sampleSize: n, takeaway });
  }
  // most-discussed first
  return out.sort((a, b) => b.sampleSize - a.sampleSize);
}
