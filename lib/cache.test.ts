import { describe, it, expect } from 'vitest';
import { cache } from '@/lib/cache';
import { DEMO_VERDICT } from '@/lib/mock';

describe('verdict cache', () => {
  it('should return null for an unseen product', async () => {
    expect(await cache.getVerdict('never-searched-xyz')).toBeNull();
  });

  it('should store and retrieve a verdict, normalizing the key', async () => {
    await cache.putVerdict('Sony WH-1000XM6', DEMO_VERDICT);
    // different casing / spacing resolves to the same entry
    const hit = await cache.getVerdict('  sony   wh-1000xm6 ');
    expect(hit?.product).toBe(DEMO_VERDICT.product);
  });
});
