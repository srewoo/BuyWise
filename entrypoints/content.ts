/**
 * Content script — on Amazon/Flipkart product pages it detects the product AND reads the
 * reviews already visible on the page, so the verdict can be grounded in them.
 * No login, no background scraping — only the page the user already opened.
 */
interface OnPageReview {
  title?: string;
  text: string;
  rating?: number;
  verified?: boolean;
}

interface OnPagePrice {
  amount: number;
  currency: string;
}

function parsePrice(raw: string): OnPagePrice | null {
  if (!raw) return null;
  const currency = raw.includes('₹') ? 'INR' : raw.includes('£') ? 'GBP' : raw.includes('€') ? 'EUR' : 'USD';
  const amount = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return !isFinite(amount) || amount <= 0 ? null : { amount, currency };
}

function extractPrice(isAmazon: boolean): OnPagePrice | null {
  const sel = isAmazon
    ? '#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice'
    : '.Nx9bqj.CxhGGd, ._30jeq3._16Jk6d, ._30jeq3'; // Flipkart current + legacy
  const raw = document.querySelector(sel)?.textContent?.trim() ?? '';
  return parsePrice(raw);
}

function retailerName(): string {
  const h = location.hostname;
  if (h.includes('amazon.in')) return 'Amazon.in';
  if (h.includes('amazon')) return 'Amazon';
  if (h.includes('flipkart')) return 'Flipkart';
  return h.replace('www.', '');
}

function extractAmazonReviews(): OnPageReview[] {
  const out: OnPageReview[] = [];
  document.querySelectorAll('[data-hook="review"]').forEach((el) => {
    const text = el.querySelector('[data-hook="review-body"]')?.textContent?.trim();
    if (!text || text.length < 20) return;
    const ratingTxt =
      el.querySelector('[data-hook="review-star-rating"] , [data-hook="cmps-review-star-rating"]')?.textContent ?? '';
    const m = ratingTxt.match(/([\d.]+)\s+out of/);
    const verified = !!el.querySelector('[data-hook="avp-badge"]'); // "Verified Purchase" badge
    out.push({
      title: el.querySelector('[data-hook="review-title"]')?.textContent?.trim(),
      text: text.slice(0, 600),
      rating: m && m[1] ? parseFloat(m[1]) : undefined,
      verified,
    });
  });
  return out;
}

function extractFlipkartReviews(): OnPageReview[] {
  const out: OnPageReview[] = [];
  // Flipkart markup is obfuscated/volatile — best-effort by review-body text class.
  document.querySelectorAll('.t-ZTKy, .ZmyHeo').forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 20) out.push({ text: text.slice(0, 600) });
  });
  return out;
}

/** Aggregate rating + count — present in the DOM immediately (unlike lazy-loaded reviews). */
function extractAggregate(isAmazon: boolean): { average?: number; count?: number } {
  const num = (s: string | null | undefined, re: RegExp) => {
    const m = (s ?? '').replace(/,/g, '').match(re);
    return m && m[1] ? parseFloat(m[1]) : undefined;
  };
  if (isAmazon) {
    const avgRaw =
      document.querySelector('#acrPopover')?.getAttribute('title') ||
      document.querySelector('span[data-hook="rating-out-of-text"]')?.textContent ||
      document.querySelector('i[data-hook="average-star-rating"] .a-icon-alt')?.textContent ||
      '';
    const cntRaw =
      document.querySelector('#acrCustomerReviewText')?.textContent ||
      document.querySelector('[data-hook="total-review-count"]')?.textContent ||
      '';
    return { average: num(avgRaw, /([\d.]+)/), count: num(cntRaw, /(\d+)/) };
  }
  const avgRaw = document.querySelector('div._3LWZlK, div.XQDdHH')?.textContent || '';
  const cntRaw = document.querySelector('span._2_R_DZ, span._13vcmD')?.textContent || '';
  return { average: num(avgRaw, /([\d.]+)/), count: num(cntRaw, /(\d+)/) };
}

export default defineContentScript({
  matches: [
    'https://*.amazon.in/*',
    'https://*.amazon.com/*',
    'https://*.flipkart.com/*',
  ],
  runAt: 'document_idle',
  main() {
    const path = location.pathname;
    const isProductPage = /\/(dp|gp\/product)\//.test(path) /* Amazon */ || /\/p\//.test(path); /* Flipkart */
    if (!isProductPage) return;

    const isAmazon = location.hostname.includes('amazon');

    // Send what we can NOW (title/price/rating are available early); retry to catch
    // lazy-loaded review bodies. Each send overwrites the cached product in the SW.
    const send = (): boolean => {
      const title =
        document.querySelector('#productTitle')?.textContent?.trim() || // Amazon
        document.querySelector('span.B_NuCI')?.textContent?.trim() || // Flipkart (legacy)
        document.querySelector('.VU-ZEz')?.textContent?.trim(); // Flipkart (current)
      if (!title || title.length <= 3) return false;

      const reviews = (isAmazon ? extractAmazonReviews() : extractFlipkartReviews()).slice(0, 12);
      chrome.runtime
        .sendMessage({
          type: 'PRODUCT_DETECTED',
          payload: {
            title,
            url: location.href,
            reviews,
            price: extractPrice(isAmazon),
            retailer: retailerName(),
            rating: extractAggregate(isAmazon),
          },
        })
        .catch(() => {});
      return reviews.length > 0;
    };

    if (send()) return; // got reviews on the first pass
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (send() || tries >= 3) clearInterval(iv);
    }, 1800);
  },
});
