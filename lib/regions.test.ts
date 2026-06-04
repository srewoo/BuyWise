import { describe, it, expect, afterEach, vi } from 'vitest';
import { getRegion, detectRegion, REGIONS } from '@/lib/regions';

afterEach(() => vi.unstubAllGlobals());

describe('regions', () => {
  it('getRegion resolves by code and falls back to US', () => {
    expect(getRegion('IN').currency).toBe('INR');
    expect(getRegion('US').currency).toBe('USD');
    expect(getRegion('ZZ').code).toBe('US'); // unknown → first (US)
    expect(getRegion(undefined).code).toBe('US');
  });

  it('every region has retailers and a currency', () => {
    for (const r of REGIONS) {
      expect(r.retailers.length).toBeGreaterThan(0);
      expect(r.currency).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('detectRegion uses the browser locale', () => {
    vi.stubGlobal('navigator', { language: 'en-IN' });
    expect(detectRegion()).toBe('IN');
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(detectRegion()).toBe('US');
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(detectRegion()).toBe('US'); // unmatched → default
  });
});
