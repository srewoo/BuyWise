import { storage } from '@/lib/storage';

export interface PricePoint {
  t: string; // ISO timestamp
  price: number;
}
interface Tracked {
  currency: string;
  points: PricePoint[];
}

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');
const dayKey = (iso: string) => iso.slice(0, 10);

/**
 * Self-built price history: every time the user views/analyzes a product on a store page,
 * we record its price. Over time this becomes a real (if shallow) history — the only free,
 * honest source, since no API exposes historical Amazon/Flipkart prices.
 */
export const priceHistory = {
  async record(product: string, price: number, currency: string): Promise<Tracked> {
    const all = await storage.raw.get<Record<string, Tracked>>('local', 'priceHistory', {});
    const key = norm(product);
    const entry = all[key] ?? { currency, points: [] };
    entry.currency = currency;
    const today = dayKey(new Date().toISOString());
    const last = entry.points[entry.points.length - 1];
    if (last && dayKey(last.t) === today) {
      last.price = price; // one point per day (latest wins)
    } else {
      entry.points.push({ t: new Date().toISOString(), price });
    }
    entry.points = entry.points.slice(-60); // cap
    all[key] = entry;
    // bound total tracked products
    const trimmed = Object.entries(all).slice(-60);
    await storage.raw.set('local', 'priceHistory', Object.fromEntries(trimmed));
    return entry;
  },
  async get(product: string): Promise<Tracked | null> {
    const all = await storage.raw.get<Record<string, Tracked>>('local', 'priceHistory', {});
    return all[norm(product)] ?? null;
  },
};
