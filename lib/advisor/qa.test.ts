import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { answerQuestion } from '@/lib/advisor/qa';
import { storage } from '@/lib/storage';
import { DEMO_VERDICT } from '@/lib/mock';

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => {
  await storage.saveSettings({ openaiKey: '' });
});

describe('answerQuestion', () => {
  it('prompts to add a key when none is set, without calling the network', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const r = await answerQuestion('Sony XM6', 'Does it overheat?', DEMO_VERDICT);
    expect(r.answer).toMatch(/key/i);
    expect(f).not.toHaveBeenCalled();
  });

  it('returns a grounded answer + citations when a key is set', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'No overheating reported by owners.',
                    citations: [{ source: 'reddit', label: 'r/headphones' }],
                  }),
                },
              },
            ],
          }),
        }) as Response,
      ),
    );
    const r = await answerQuestion('Sony XM6', 'Does it overheat?', DEMO_VERDICT);
    expect(r.question).toBe('Does it overheat?');
    expect(r.answer).toMatch(/overheating/i);
    expect(r.citations[0]?.source).toBe('reddit');
  });

  it('merges live web citations and answers beyond the frozen analysis', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/v1/responses')) {
          // web search returns a cited finding the frozen analysis never had
          return {
            ok: true,
            status: 200,
            json: async () => ({
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: 'Levi’s 501 is sold in both men’s and women’s cuts, plus a kids’ line.',
                      annotations: [{ type: 'url_citation', url: 'https://www.levi.com/kids', title: 'Levi' }],
                    },
                  ],
                },
              ],
            }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'Yes — the 501 comes in men’s, women’s and kids’ versions.',
                    relevant: true,
                    citations: [],
                  }),
                },
              },
            ],
          }),
        } as Response;
      }),
    );
    const r = await answerQuestion("Levi's 501", 'is it available for boys and girls both?', DEMO_VERDICT);
    expect(r.answer).toMatch(/kids|women|both/i);
    expect(r.citations.some((c) => c.source === 'expert' && c.label === 'levi.com')).toBe(true);
  });

  it('declines an off-topic question (relevance guard)', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/v1/responses')) return { ok: false, status: 404 } as Response;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'I can only help with questions about this product.',
                    relevant: false,
                    citations: [{ source: 'expert', label: 'should-be-dropped' }],
                  }),
                },
              },
            ],
          }),
        } as Response;
      }),
    );
    const r = await answerQuestion('Sony XM6', 'What is the capital of France?', DEMO_VERDICT);
    expect(r.answer).toMatch(/only help with questions about this product/i);
    expect(r.citations).toEqual([]); // off-topic → no citations attached
  });
});
