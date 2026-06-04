import { describe, it, expect } from 'vitest';
import { Verdict, VERDICT_META } from '@/lib/types';
import { DEMO_VERDICT } from '@/lib/mock';

describe('Verdict schema', () => {
  it('should validate the seeded demo verdict', () => {
    expect(() => Verdict.parse(DEMO_VERDICT)).not.toThrow();
  });

  it('should reject an invalid decision value', () => {
    expect(() => Verdict.parse({ ...DEMO_VERDICT, decision: 'maybe' })).toThrow();
  });

  it('should reject confidence outside 0..1', () => {
    expect(() => Verdict.parse({ ...DEMO_VERDICT, confidence: 1.5 })).toThrow();
  });

  it('should expose verdict metadata for every decision', () => {
    for (const d of ['buy', 'consider', 'skip'] as const) {
      expect(VERDICT_META[d].label).toBeTruthy();
      expect(VERDICT_META[d].text).toContain('text-');
    }
  });
});
