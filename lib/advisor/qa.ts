import type { QAItem, Verdict } from '@/lib/types';
import { storage } from '@/lib/storage';
import { chatJSON } from './openai';

/** Answer a follow-up question grounded ONLY in the verdict we already produced. */
export async function answerQuestion(product: string, question: string, verdict: Verdict): Promise<QAItem> {
  const settings = await storage.getSettings();
  if (!settings.openaiKey) {
    return {
      question,
      answer: 'Add your OpenAI key in Settings to ask live questions about this product.',
      citations: [],
    };
  }

  const context = [
    `Verdict: ${verdict.decision.toUpperCase()} (${Math.round(verdict.confidence * 100)}% confidence). ${verdict.oneLiner}`,
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

  try {
    const out = await chatJSON<{ answer: string; citations: { source: string; label: string }[] }>({
      apiKey: settings.openaiKey,
      model: settings.model || 'gpt-5',
      system:
        "You answer a buyer's follow-up question about a product using ONLY the analysis provided. Be concise (2-4 sentences), specific, and honest. If the analysis doesn't cover it, say so plainly. Cite which source types support your answer.",
      user: `Product: ${product}\nQuestion: ${question}\n\nANALYSIS:\n${context}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['answer', 'citations'],
        properties: {
          answer: { type: 'string' },
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
      signal: new AbortController().signal,
      maxTokens: 700,
    });
    return {
      question,
      answer: out.answer,
      citations: (out.citations ?? []) as QAItem['citations'],
    };
  } catch (e) {
    return {
      question,
      answer: `Couldn't answer right now (${e instanceof Error ? e.message : 'error'}). Try again.`,
      citations: [],
    };
  }
}
