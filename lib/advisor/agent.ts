import type { ReviewItem } from '@/lib/types';
import type { Settings } from '@/lib/storage';
import { getRegion } from '@/lib/regions';
import { chatJSON, responsesWebSearch, type WebFinding } from './openai';
import { perplexitySearch } from './perplexity';

export interface AgentProgress {
  stage: 'planning' | 'researching' | 'verifying';
  message?: string;
}

export interface AgentResult {
  webItems: ReviewItem[]; // citations as 'expert'/web evidence
  verifiedDigest: string; // consolidated, fact-checked findings for the synthesizer
  webCount: number;
  perplexityUsed: boolean;
}

async function planAngles(product: string, settings: Settings, signal: AbortSignal): Promise<string[]> {
  const region = getRegion(settings.region);
  const fallback = [
    `reliability and common defects`,
    `real owner experience after months of use`,
    `how it compares to its main rivals`,
    `current price and availability in ${region.name}`,
    `who should NOT buy it`,
  ];
  try {
    const out = await chatJSON<{ angles: string[] }>({
      apiKey: settings.openaiKey,
      model: settings.model || 'gpt-5',
      system:
        'You plan a product-research investigation. Output 4-5 distinct research angles a careful buyer would investigate (reliability, long-term experience, comparisons, price/availability, deal-breakers). Be specific to the product.',
      user: `Product: ${product}\nRegion: ${region.name}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['angles'],
        properties: { angles: { type: 'array', items: { type: 'string' } } },
      },
      schemaName: 'angles',
      signal,
      maxTokens: 400,
    });
    const a = out.angles?.filter((x) => typeof x === 'string' && x.trim()).slice(0, 5);
    return a && a.length ? a : fallback;
  } catch {
    return fallback;
  }
}

async function researchAngle(
  product: string,
  angle: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<{ angle: string; finding: WebFinding } | null> {
  const prompt = `Research this about "${product}": ${angle}. Use the web. Report concrete, sourced findings (specific facts, recurring complaints, comparisons, prices) in 4-6 bullet points. Cite sources.`;
  const [web, ppx] = await Promise.all([
    responsesWebSearch(settings.openaiKey, settings.model || 'gpt-5', prompt, signal),
    perplexitySearch(settings.perplexityKey, `${product}: ${angle}`, signal),
  ]);
  const text = [web?.text, ppx?.text].filter(Boolean).join('\n');
  const citations = [...(web?.citations ?? []), ...(ppx?.citations ?? [])];
  return text ? { angle, finding: { text, citations } } : null;
}

async function verify(product: string, findings: string, settings: Settings, signal: AbortSignal): Promise<string> {
  if (!findings.trim()) return '';
  try {
    const out = await chatJSON<{ digest: string }>({
      apiKey: settings.openaiKey,
      model: settings.model || 'gpt-5',
      system:
        'You are a skeptical fact-checker. Given multi-source web research, produce a consolidated evidence digest that KEEPS only claims that are concrete and sourced, DROPS speculation/unverifiable marketing, and notes where sources disagree. Group by theme. Be concise.',
      user: `Product: ${product}\n\nRESEARCH FINDINGS:\n${findings.slice(0, 9000)}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['digest'],
        properties: { digest: { type: 'string' } },
      },
      schemaName: 'verified',
      signal,
      maxTokens: 1500,
    });
    return out.digest ?? '';
  } catch {
    return findings.slice(0, 4000); // fall back to raw findings if verifier fails
  }
}

/**
 * Multi-agent web research: plan angles → research each in parallel (OpenAI web search +
 * optional Perplexity) → verify. Returns web-cited evidence + a fact-checked digest.
 * Fully graceful: if web search is unavailable, returns empty and the caller falls back
 * to the local (Reddit/YouTube/on-page) pipeline.
 */
export async function runAgentic(
  product: string,
  settings: Settings,
  signal: AbortSignal,
  onProgress: (p: AgentProgress) => void = () => {},
): Promise<AgentResult> {
  onProgress({ stage: 'planning', message: 'Planning the investigation' });
  const angles = await planAngles(product, settings, signal);

  onProgress({ stage: 'researching', message: `Researching ${angles.length} angles across the web` });
  const settled = await Promise.allSettled(angles.map((a) => researchAngle(product, a, settings, signal)));
  const results = settled
    .map((s) => (s.status === 'fulfilled' ? s.value : null))
    .filter((r): r is { angle: string; finding: WebFinding } => !!r);

  // If web search returned nothing (e.g. account/model lacks web_search), bail out cleanly —
  // the caller falls back to the local Reddit/YouTube/on-page pipeline. Avoids a wasted verify call.
  if (results.length === 0) {
    return { webItems: [], verifiedDigest: '', webCount: 0, perplexityUsed: false };
  }

  const webItems: ReviewItem[] = [];
  const seenUrl = new Set<string>();
  let perplexityUsed = false;
  for (const r of results) {
    if (settings.perplexityKey) perplexityUsed = true;
    for (const c of r.finding.citations) {
      if (!c.url || seenUrl.has(c.url)) continue;
      seenUrl.add(c.url);
      webItems.push({
        id: `web:${seenUrl.size}`,
        source: 'expert',
        url: c.url,
        title: c.title,
        text: `${r.angle}: ${r.finding.text.replace(/\s+/g, ' ').slice(0, 300)}`,
      });
    }
  }

  const combined = results.map((r) => `## ${r.angle}\n${r.finding.text}`).join('\n\n');
  onProgress({ stage: 'verifying', message: 'Fact-checking findings' });
  const verifiedDigest = await verify(product, combined, settings, signal);

  return { webItems, verifiedDigest, webCount: webItems.length, perplexityUsed };
}
