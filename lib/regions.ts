/** Regions the buying advisor supports. Drives currency, a sample-seller list, and
 * the regional hint appended to source queries + the GPT prompt.
 * Add a new entry here to support another country — nothing else hardcodes regions. */
export interface Region {
  code: string;
  name: string;
  flag: string;
  currency: string; // ISO 4217, used by Intl.NumberFormat
  /** Illustrative sellers across categories (marketplaces, supermarkets, brand outlets, etc.) —
   *  a HINT for the model, not a hard allowlist. Products span cars → cold drinks, so the model
   *  is free to name a dealership, showroom, or specialist store when that fits the category. */
  retailers: string[];
  queryHint: string; // appended to source search queries ('' = none)
  locales: string[]; // navigator.language prefixes for auto-detect
}

export const REGIONS: Region[] = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    retailers: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Costco'],
    queryHint: '',
    locales: ['en-us', 'en'],
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    retailers: ['Amazon.in', 'Flipkart', 'Reliance Retail', 'Croma', 'DMart'],
    queryHint: 'India',
    locales: ['en-in', 'hi', 'hi-in', 'bn', 'ta', 'te'],
  },
];

export const DEFAULT_REGION = 'US';

export function getRegion(code?: string): Region {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0]!;
}

/** Best-effort region from the browser locale; falls back to US.
 * Matches the FULL locale first (so en-IN → India, not US via the bare "en"). */
export function detectRegion(): string {
  const lang = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US').toLowerCase();
  const exact = REGIONS.find((r) => r.locales.includes(lang));
  if (exact) return exact.code;
  const primary = lang.split('-')[0] ?? '';
  const byLang = REGIONS.find((r) => r.locales.includes(primary));
  return byLang?.code ?? DEFAULT_REGION;
}
