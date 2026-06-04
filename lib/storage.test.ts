import { describe, it, expect } from 'vitest';
import { storage, DEFAULT_SETTINGS } from '@/lib/storage';

// In a node environment `chrome` is undefined, so storage uses its in-memory fallback.
describe('storage (in-memory fallback)', () => {
  it('should return defaults before anything is saved', async () => {
    const s = await storage.getSettings();
    expect(s.model).toBe(DEFAULT_SETTINGS.model);
    expect(s.openaiKey).toBe('');
  });

  it('should round-trip secrets and prefs', async () => {
    await storage.saveSettings({ openaiKey: 'sk-test', deepResearch: true, model: 'gpt-5-mini' });
    const s = await storage.getSettings();
    expect(s.openaiKey).toBe('sk-test');
    expect(s.deepResearch).toBe(true);
    expect(s.model).toBe('gpt-5-mini');
  });

  it('should de-duplicate and cap history', async () => {
    await storage.pushHistory('A');
    await storage.pushHistory('B');
    const h = await storage.pushHistory('A'); // A moves to front, no dupe
    expect(h[0]).toBe('A');
    expect(h.filter((x) => x === 'A')).toHaveLength(1);
  });
});
