/**
 * Content script — an OPTIONAL convenience, not the boundary of what BuyWise researches.
 * BuyWise advises on any retail purchase (cars, clothes, shoes, appliances, groceries, gadgets…),
 * online or in-store, via the side-panel search. This script auto-prefills that search and grounds
 * the verdict in on-page price/reviews when the user is on a product page.
 *
 * Detection has two layers (see lib/pageExtract.ts): rich site-specific selectors for Amazon/Flipkart,
 * and a GENERIC schema.org/OpenGraph reader that works on most other retail sites without bespoke
 * selectors. All parsing lives in lib/pageExtract.ts and is unit-tested, so selector rot is caught.
 * No login, no background scraping — only the page the user already opened.
 */
import { detectSite, looksLikeProductPath, extractProduct } from '@/lib/pageExtract';

export default defineContentScript({
  matches: [
    // Rich, site-specific extraction:
    'https://*.amazon.in/*',
    'https://*.amazon.com/*',
    'https://*.flipkart.com/*',
    // Broad retail coverage via the generic schema.org/OpenGraph reader (spans categories):
    'https://*.bestbuy.com/*',
    'https://*.walmart.com/*',
    'https://*.target.com/*',
    'https://*.ebay.com/*',
    'https://*.nike.com/*',
    'https://*.adidas.com/*',
    'https://*.myntra.com/*',
    'https://*.ajio.com/*',
    'https://*.nykaa.com/*',
    'https://*.croma.com/*',
    'https://*.reliancedigital.in/*',
    'https://*.cars.com/*',
    'https://*.carwale.com/*',
    'https://*.cardekho.com/*',
    'https://*.ikea.com/*',
    'https://*.wayfair.com/*',
  ],
  runAt: 'document_idle',
  main() {
    const site = detectSite(location.hostname);
    // For sites we know the URL scheme of, gate on the product path to avoid firing on listings/home.
    // For generic sites, extractProduct() returning non-null (structured data present) is the gate.
    if ((site === 'amazon' || site === 'flipkart') && !looksLikeProductPath(site, location.pathname)) return;

    // Send what we can NOW (title/price/rating are available early); retry to catch lazy-loaded
    // review bodies. Each send overwrites the cached product in the SW.
    const send = (): boolean => {
      const product = extractProduct(document, location.hostname, location.href);
      if (!product) return false;
      chrome.runtime
        .sendMessage({
          type: 'PRODUCT_DETECTED',
          payload: {
            title: product.title,
            url: product.url,
            reviews: product.reviews,
            price: product.price,
            listPrice: product.listPrice,
            retailer: product.retailer,
            rating: product.rating,
          },
        })
        .catch(() => {});
      return product.reviews.length > 0;
    };

    if (send()) return; // got reviews on the first pass
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (send() || tries >= 3) clearInterval(iv);
    }, 1800);
  },
});
