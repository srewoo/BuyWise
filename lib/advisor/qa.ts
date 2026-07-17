import type { QAItem, Verdict } from '@/lib/types';
import { storage } from '@/lib/storage';
import { getRegion } from '@/lib/regions';
import { chatJSON, responsesWebSearch } from './openai';

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 40);
  }
};

/**
 * Answer a buyer's follow-up about the product. Grounding order:
 *   1. the verdict analysis we already produced (authoritative for pros/cons/trust/price),
 *   2. a LIVE web search scoped to this product (current facts the analysis never covered —
 *      variants, sizing, availability, "is there a kids' version", latest recalls, etc.),
 *   3. the model's general product knowledge, clearly the lowest-confidence source.
 * Off-topic questions (not about this product or the buying decision) are politely declined.
 */
export async function answerQuestion(product: string, question: string, verdict: Verdict): Promise<QAItem> {
  const settings = await storage.getSettings();
  if (!settings.openaiKey) {
    return {
      question,
      answer: 'Add your OpenAI key in Settings to ask live questions about this product.',
      citations: [],
    };
  }

  const signal = new AbortController().signal;
  const region = getRegion(settings.region);

  const analysis = [
    `Verdict: ${verdict.decision.toUpperCase()} (${Math.round(verdict.confidence * 100)}% confidence). ${verdict.oneLiner}`,
    verdict.category ? `Category: ${verdict.category}` : '',
    `Overview: ${verdict.overview}`,
    `Pros: ${verdict.pros.map((p) => p.label).join('; ')}`,
    `Cons: ${verdict.cons.map((c) => c.label).join('; ')}`,
    verdict.community.length
      ? `Community: ${verdict.community.map((c) => `${c.label} — ${c.takeaway}`).join(' | ')}`
      : '',
    `Trust: ${verdict.trust.note}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Live web lookup for the SPECIFIC question — current facts the frozen analysis can't hold.
  // Degrades to null (older accounts / unsupported models / offline) so we still answer from the
  // analysis + general knowledge.
  let webText = '';
  const webCitations: QAItem['citations'] = [];
  try {
    const web = await responsesWebSearch(
      settings.openaiKey,
      settings.model || 'gpt-5',
      `Question about the product "${product}" (market: ${region.name}): ${question}\n` +
        `Answer with current, factual, product-specific information only. If the question is not about this product, say it is off-topic.`,
      signal,
    );
    if (web?.text) {
      webText = web.text.slice(0, 1800);
      for (const c of web.citations.slice(0, 3)) {
        const label = hostOf(c.url);
        if (!webCitations.some((w) => w.label === label)) webCitations.push({ source: 'expert', label });
      }
    }
  } catch {
    /* web search is best-effort */
  }

  try {
    const out = await chatJSON<{ answer: string; relevant: boolean; citations: { source: string; label: string }[] }>({
      apiKey: settings.openaiKey,
      model: settings.model || 'gpt-5',
      system:
        'You answer a buyer\'s follow-up question about ONE specific product. ' +
        'RELEVANCE GUARD: only answer if the question is about this product or the decision to buy it ' +
        '(features, specs, variants, sizing, availability, price, reliability, comparisons, alternatives, care, warranty). ' +
        'If it is unrelated (general chit-chat, other topics, other products not being compared), set relevant=false and ' +
        'answer with a single polite sentence redirecting to questions about this product — do NOT answer the off-topic question. ' +
        'When relevant: answer in 2-4 concise, specific sentences. Prefer the ANALYSIS for pros/cons/trust/price; use the LIVE WEB RESULTS ' +
        'for current facts the analysis lacks; you may add general product knowledge but flag it as general when uncertain. ' +
        'Never invent specifics. Cite the source types you actually used (expert = web/general, retail/reddit/youtube/pricing = from analysis).',
      user:
        `Product: ${product}\nQuestion: ${question}\n\nANALYSIS (authoritative):\n${analysis}\n\n` +
        (webText ? `LIVE WEB RESULTS (current, product-specific):\n${webText}\n` : 'LIVE WEB RESULTS: (none available)\n'),
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['answer', 'relevant', 'citations'],
        properties: {
          answer: { type: 'string' },
          relevant: { type: 'boolean' },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['source', 'label'],
              properties: {
                source: { type: 'string', enum: ['reddit', 'youtube', 'retail', 'expert', 'pricing'] },
                label: { type: 'string' },
              },
            },
          },
        },
      },
      schemaName: 'qa',
      signal,
      // Must comfortably exceed the reasoning-token overhead of reasoning models (e.g. gpt-5):
      // reasoning tokens are drawn from this same budget, so a small cap (e.g. 700) gets fully
      // consumed by reasoning and returns empty content — which read as "the chat never responds".
      maxTokens: 3000,
    });

    const answer = (out.answer ?? '').trim();
    const modelCitations = (out.citations ?? []) as QAItem['citations'];
    // Only attach real web citations when the model judged the question relevant + answered it.
    const citations =
      out.relevant === false
        ? []
        : [...modelCitations, ...webCitations.filter((w) => !modelCitations.some((m) => m.label === w.label))].slice(0, 5);

    return {
      question,
      answer: answer || "I couldn't find a reliable answer to that for this product. Try rephrasing your question.",
      citations,
    };
  } catch (e) {
    return {
      question,
      answer: `Couldn't answer right now (${e instanceof Error ? e.message : 'error'}). Try again.`,
      citations: [],
    };
  }
}
