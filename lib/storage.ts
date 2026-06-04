/**
 * chrome.storage wrappers with an in-memory fallback so the same code runs in the
 * extension (real storage) and in the standalone gallery preview (no chrome API).
 *
 * Everything (keys, prefs, history, cache) is in chrome.storage.local so it survives
 * extension/browser reloads. Keys live only in this browser and are sent only to each
 * provider (OpenAI / YouTube) — never to us (there is no backend).
 */

export interface Settings {
  openaiKey: string;
  youtubeKey: string;
  serpApiKey: string;
  perplexityKey: string;
  model: string;
  deepResearch: boolean;
  priceAlerts: boolean;
  region: string; // region code, e.g. 'US' | 'IN' (see lib/regions.ts)
  budgetMax: number; // 0 = no limit (in the region's currency)
  brands: string[]; // preferred brands
}

export const DEFAULT_SETTINGS: Settings = {
  openaiKey: '',
  youtubeKey: '',
  serpApiKey: '',
  perplexityKey: '',
  model: 'gpt-5',
  deepResearch: false,
  priceAlerts: true,
  region: '', // '' = auto-detect from browser locale on first use
  budgetMax: 0,
  brands: [],
};

const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage;
const mem = new Map<string, unknown>();

type Area = 'local' | 'session';

async function get<T>(area: Area, key: string, fallback: T): Promise<T> {
  if (!hasChrome) return (mem.get(`${area}:${key}`) as T) ?? fallback;
  const res = await chrome.storage[area].get(key);
  return (res[key] as T) ?? fallback;
}

async function set(area: Area, key: string, value: unknown): Promise<void> {
  if (!hasChrome) {
    mem.set(`${area}:${key}`, value);
    return;
  }
  await chrome.storage[area].set({ [key]: value });
}

export const storage = {
  async getSettings(): Promise<Settings> {
    const [secrets, prefs] = await Promise.all([
      get<Partial<Settings>>('local', 'secrets', {}),
      get<Partial<Settings>>('local', 'prefs', {}),
    ]);
    return { ...DEFAULT_SETTINGS, ...prefs, ...secrets };
  },
  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    // Persist to local (disk) so keys + prefs survive extension/browser reloads.
    // Keys live only in this browser's extension storage and are sent only to each provider.
    await set('local', 'secrets', {
      openaiKey: next.openaiKey,
      youtubeKey: next.youtubeKey,
      serpApiKey: next.serpApiKey,
      perplexityKey: next.perplexityKey,
    });
    await set('local', 'prefs', {
      model: next.model,
      deepResearch: next.deepResearch,
      priceAlerts: next.priceAlerts,
      region: next.region,
      budgetMax: next.budgetMax,
      brands: next.brands,
    });
    return next;
  },
  getHistory: () => get<string[]>('local', 'history', []),
  async pushHistory(q: string): Promise<string[]> {
    const h = await get<string[]>('local', 'history', []);
    const next = [q, ...h.filter((x) => x !== q)].slice(0, 12);
    await set('local', 'history', next);
    return next;
  },
  raw: { get, set },
};
