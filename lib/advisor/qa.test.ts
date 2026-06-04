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
});
