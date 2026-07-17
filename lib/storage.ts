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

/** A price watch. There is no backend/price feed, so an alert fires when BuyWise next OBSERVES a
 *  price (a page price during analysis, or a manually-logged price) at/below the target. */
export interface PriceAlert {
  product: string;
  currency: string;
  targetPrice: number;
  createdAt: string;
  lastPrice?: number;
  triggeredAt?: string;
  triggeredPrice?: number;
}

const normProduct = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

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
  async removeHistory(q: string): Promise<string[]> {
    const h = await get<string[]>('local', 'history', []);
    const next = h.filter((x) => x !== q);
    await set('local', 'history', next);
    return next;
  },

  /* ───────────────────────── Price alerts ───────────────────────── */
  getAlerts: () => get<PriceAlert[]>('local', 'alerts', []),
  async findAlert(product: string): Promise<PriceAlert | null> {
    const key = normProduct(product);
    return (await this.getAlerts()).find((a) => normProduct(a.product) === key) ?? null;
  },
  /** Create or update the alert for a product (resets triggered state on a new target). */
  async setAlert(product: string, targetPrice: number, currency: string): Promise<PriceAlert> {
    const alerts = await this.getAlerts();
    const key = normProduct(product);
    const existing = alerts.find((a) => normProduct(a.product) === key);
    const alert: PriceAlert = {
      product,
      currency,
      targetPrice,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastPrice: existing?.lastPrice,
    };
    const next = [alert, ...alerts.filter((a) => normProduct(a.product) !== key)].slice(0, 50);
    await set('local', 'alerts', next);
    return alert;
  },
  async removeAlert(product: string): Promise<PriceAlert[]> {
    const key = normProduct(product);
    const next = (await this.getAlerts()).filter((a) => normProduct(a.product) !== key);
    await set('local', 'alerts', next);
    return next;
  },
  /**
   * Record an observed price against any matching alert. Returns the alert ONLY when this
   * observation newly triggers it (price ≤ target, not already triggered) — so callers can notify.
   */
  async checkAlerts(product: string, price: number, currency: string): Promise<PriceAlert | null> {
    const alerts = await this.getAlerts();
    const key = normProduct(product);
    const idx = alerts.findIndex((a) => normProduct(a.product) === key);
    if (idx < 0) return null;
    const a = { ...alerts[idx]! };
    a.lastPrice = price;
    a.currency = currency || a.currency;
    let newlyTriggered: PriceAlert | null = null;
    if (price <= a.targetPrice && !a.triggeredAt) {
      a.triggeredAt = new Date().toISOString();
      a.triggeredPrice = price;
      newlyTriggered = a;
    }
    alerts[idx] = a;
    await set('local', 'alerts', alerts);
    return newlyTriggered;
  },
  raw: { get, set },
};
