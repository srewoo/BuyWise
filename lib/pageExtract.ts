/**
 * Page extraction — pure, DOM-in / data-out functions shared by the content script and its tests.
 *
 * Two layers, most-robust-last:
 *   1. Site-specific selectors (Amazon, Flipkart) — richest data (review bodies, verified badges),
 *      but brittle: markup changes silently break them, so they are unit-tested against sample DOM.
 *   2. A GENERIC extractor reading schema.org/Product JSON-LD + OpenGraph meta — no per-site
 *      selectors, so it works across most modern retail sites (electronics, apparel, cars, grocery)
 *      and de-risks selector rot. This is what makes "research any purchase" auto-detect broadly.
 */

export interface OnPagePrice {
  amount: number;
  currency: string;
}
export interface OnPageReview {
  title?: string;
  text: string;
  rating?: number;
  verified?: boolean;
}
export interface PageProduct {
  title: string;
  url?: string;
  price: OnPagePrice | null;
  listPrice?: number;
  retailer: string;
  rating: { average?: number; count?: number };
  reviews: OnPageReview[];
}

export type SiteKind = 'amazon' | 'flipkart' | 'generic';

export function detectSite(hostname: string): SiteKind {
  if (hostname.includes('amazon')) return 'amazon';
  if (hostname.includes('flipkart')) return 'flipkart';
  return 'generic';
}

export function retailerName(hostname: string): string {
  const h = hostname.replace(/^www\./, '');
  if (h.includes('amazon.in')) return 'Amazon.in';
  if (h.includes('amazon')) return 'Amazon';
  if (h.includes('flipkart')) return 'Flipkart';
  return h;
}

const CURRENCY_SYMBOLS: [string, string][] = [
  ['₹', 'INR'],
  ['£', 'GBP'],
  ['€', 'EUR'],
  ['$', 'USD'],
];

export function parsePrice(raw: string): OnPagePrice | null {
  if (!raw) return null;
  const symbol = CURRENCY_SYMBOLS.find(([s]) => raw.includes(s));
  const iso = raw.match(/\b(USD|INR|GBP|EUR|AUD|CAD|JPY|CNY)\b/i);
  const currency = iso ? iso[1]!.toUpperCase() : symbol ? symbol[1] : 'USD';
  const amount = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return !isFinite(amount) || amount <= 0 ? null : { amount, currency };
}

/* ─────────────────────────── Amazon ─────────────────────────── */

export function extractAmazon(doc: Document): Partial<PageProduct> {
  const title =
    doc.querySelector('#productTitle')?.textContent?.trim() || undefined;
  const priceRaw =
    doc.querySelector(
      '#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice',
    )?.textContent?.trim() ?? '';
  const listRaw =
    doc.querySelector(
      '.basisPrice .a-offscreen, span.a-price.a-text-price .a-offscreen, .a-text-price[data-a-strike="true"] .a-offscreen, #listPrice, #priceblock_listprice',
    )?.textContent?.trim() ?? '';

  const reviews: OnPageReview[] = [];
  doc.querySelectorAll('[data-hook="review"]').forEach((el) => {
    const text = el.querySelector('[data-hook="review-body"]')?.textContent?.trim();
    if (!text || text.length < 20) return;
    const ratingTxt =
      el.querySelector('[data-hook="review-star-rating"] , [data-hook="cmps-review-star-rating"]')?.textContent ?? '';
    const m = ratingTxt.match(/([\d.]+)\s+out of/);
    reviews.push({
      title: el.querySelector('[data-hook="review-title"]')?.textContent?.trim(),
      text: text.slice(0, 600),
      rating: m && m[1] ? parseFloat(m[1]) : undefined,
      verified: !!el.querySelector('[data-hook="avp-badge"]'),
    });
  });

  const num = (s: string | null | undefined, re: RegExp) => {
    const mm = (s ?? '').replace(/,/g, '').match(re);
    return mm && mm[1] ? parseFloat(mm[1]) : undefined;
  };
  const avgRaw =
    doc.querySelector('#acrPopover')?.getAttribute('title') ||
    doc.querySelector('span[data-hook="rating-out-of-text"]')?.textContent ||
    doc.querySelector('i[data-hook="average-star-rating"] .a-icon-alt')?.textContent ||
    '';
  const cntRaw =
    doc.querySelector('#acrCustomerReviewText')?.textContent ||
    doc.querySelector('[data-hook="total-review-count"]')?.textContent ||
    '';

  return {
    title,
    price: parsePrice(priceRaw),
    listPrice: parsePrice(listRaw)?.amount,
    rating: { average: num(avgRaw, /([\d.]+)/), count: num(cntRaw, /(\d+)/) },
    reviews,
  };
}

/* ─────────────────────────── Flipkart ─────────────────────────── */

export function extractFlipkart(doc: Document): Partial<PageProduct> {
  const title =
    doc.querySelector('span.B_NuCI')?.textContent?.trim() ||
    doc.querySelector('.VU-ZEz')?.textContent?.trim() ||
    undefined;
  const priceRaw = doc.querySelector('.Nx9bqj.CxhGGd, ._30jeq3._16Jk6d, ._30jeq3')?.textContent?.trim() ?? '';
  const listRaw = doc.querySelector('.yRaY8j, ._3I9_wc._2p6lqe, ._3I9_wc')?.textContent?.trim() ?? '';

  const reviews: OnPageReview[] = [];
  doc.querySelectorAll('.t-ZTKy, .ZmyHeo').forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 20) reviews.push({ text: text.slice(0, 600) });
  });

  const num = (s: string | null | undefined, re: RegExp) => {
    const mm = (s ?? '').replace(/,/g, '').match(re);
    return mm && mm[1] ? parseFloat(mm[1]) : undefined;
  };
  const avgRaw = doc.querySelector('div._3LWZlK, div.XQDdHH')?.textContent || '';
  const cntRaw = doc.querySelector('span._2_R_DZ, span._13vcmD')?.textContent || '';

  return {
    title,
    price: parsePrice(priceRaw),
    listPrice: parsePrice(listRaw)?.amount,
    rating: { average: num(avgRaw, /([\d.]+)/), count: num(cntRaw, /(\d+)/) },
    reviews,
  };
}

/* ─────────────────── Generic: schema.org + OpenGraph ─────────────────── */

function metaContent(doc: Document, keys: string[]): string | undefined {
  for (const k of keys) {
    const el =
      doc.querySelector(`meta[property="${k}"]`) || doc.querySelector(`meta[name="${k}"]`);
    const c = el?.getAttribute('content')?.trim();
    if (c) return c;
  }
  return undefined;
}

/** Reads schema.org/Product JSON-LD (name, offers.price/priceCurrency, aggregateRating). */
export function extractJsonLdProduct(doc: Document): Partial<PageProduct> {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const s of Array.from(scripts)) {
    let data: unknown;
    try {
      data = JSON.parse(s.textContent || '');
    } catch {
      continue;
    }
    const graph = Array.isArray(data)
      ? data
      : (data as { '@graph'?: unknown[] })['@graph'] ?? [data];
    for (const raw of graph as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') continue;
      const type = raw['@type'];
      const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      if (!isProduct) continue;
      const offersRaw = raw['offers'];
      const offer = (Array.isArray(offersRaw) ? offersRaw[0] : offersRaw) as
        | Record<string, unknown>
        | undefined;
      const agg = raw['aggregateRating'] as Record<string, unknown> | undefined;
      const priceNum = offer?.['price'] != null ? Number(offer['price']) : NaN;
      const currency = typeof offer?.['priceCurrency'] === 'string' ? (offer['priceCurrency'] as string) : undefined;
      return {
        title: typeof raw['name'] === 'string' ? (raw['name'] as string) : undefined,
        price: isFinite(priceNum) && priceNum > 0 ? { amount: priceNum, currency: currency || 'USD' } : null,
        rating: {
          average: agg?.['ratingValue'] != null ? Number(agg['ratingValue']) : undefined,
          count: agg?.['reviewCount'] != null ? Number(agg['reviewCount']) : agg?.['ratingCount'] != null ? Number(agg['ratingCount']) : undefined,
        },
      };
    }
  }
  return {};
}

/** Generic extractor for any retail site: JSON-LD first, then OpenGraph meta tags. */
export function extractGeneric(doc: Document): Partial<PageProduct> {
  const jsonLd = extractJsonLdProduct(doc);
  const ogTitle = metaContent(doc, ['og:title', 'twitter:title']);
  const ogPriceAmount = metaContent(doc, ['product:price:amount', 'og:price:amount']);
  const ogPriceCurrency = metaContent(doc, ['product:price:currency', 'og:price:currency']);

  const title = jsonLd.title || ogTitle || doc.querySelector('h1')?.textContent?.trim() || undefined;
  let price = jsonLd.price ?? null;
  if (!price && ogPriceAmount) {
    const amount = parseFloat(ogPriceAmount.replace(/[^0-9.]/g, ''));
    if (isFinite(amount) && amount > 0) price = { amount, currency: ogPriceCurrency || 'USD' };
  }
  return { title, price, rating: jsonLd.rating ?? {} };
}

/* ─────────────────────────── Orchestration ─────────────────────────── */

/** True if the current URL looks like a product/detail page for the given site. */
export function looksLikeProductPath(site: SiteKind, path: string): boolean {
  if (site === 'amazon') return /\/(dp|gp\/product)\//.test(path);
  if (site === 'flipkart') return /\/p\//.test(path);
  // Generic retail sites vary wildly; rely on structured-data presence instead of the path.
  return true;
}

/**
 * Extract a product from a page. Site-specific where we have selectors, generic (JSON-LD/OG)
 * everywhere else, with generic data filling any gaps the site-specific pass left empty.
 * Returns null when no usable product title is found (so non-product pages are ignored).
 */
export function extractProduct(doc: Document, hostname: string, url?: string): PageProduct | null {
  const site = detectSite(hostname);
  const base: Partial<PageProduct> =
    site === 'amazon' ? extractAmazon(doc) : site === 'flipkart' ? extractFlipkart(doc) : {};
  const generic = extractGeneric(doc);

  const title = (base.title || generic.title || '').trim();
  if (!title || title.length <= 3) return null;

  const rating = base.rating && (base.rating.average || base.rating.count) ? base.rating : generic.rating ?? {};

  return {
    title,
    url,
    price: base.price ?? generic.price ?? null,
    listPrice: base.listPrice,
    retailer: retailerName(hostname),
    rating,
    reviews: base.reviews ?? [],
  };
}
