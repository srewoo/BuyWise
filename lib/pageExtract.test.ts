// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parsePrice,
  detectSite,
  retailerName,
  extractAmazon,
  extractGeneric,
  extractProduct,
  looksLikeProductPath,
} from '@/lib/pageExtract';

const setBody = (html: string) => {
  document.head.innerHTML = '';
  document.body.innerHTML = html;
};

describe('parsePrice', () => {
  it('parses currency symbols and amounts', () => {
    expect(parsePrice('₹42,990')).toEqual({ amount: 42990, currency: 'INR' });
    expect(parsePrice('$399.00')).toEqual({ amount: 399, currency: 'USD' });
    expect(parsePrice('£1,299')).toEqual({ amount: 1299, currency: 'GBP' });
  });
  it('prefers an explicit ISO code and rejects junk', () => {
    expect(parsePrice('USD 50')).toEqual({ amount: 50, currency: 'USD' });
    expect(parsePrice('out of stock')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });
});

describe('detectSite / retailerName', () => {
  it('classifies known hosts and names them', () => {
    expect(detectSite('www.amazon.in')).toBe('amazon');
    expect(detectSite('www.flipkart.com')).toBe('flipkart');
    expect(detectSite('www.bestbuy.com')).toBe('generic');
    expect(retailerName('www.amazon.in')).toBe('Amazon.in');
    expect(retailerName('www.nike.com')).toBe('nike.com');
  });
});

describe('looksLikeProductPath', () => {
  it('matches Amazon/Flipkart product paths and defers to data for generic', () => {
    expect(looksLikeProductPath('amazon', '/dp/B0ABC')).toBe(true);
    expect(looksLikeProductPath('amazon', '/gp/bestsellers')).toBe(false);
    expect(looksLikeProductPath('flipkart', '/apple-iphone/p/itm123')).toBe(true);
    expect(looksLikeProductPath('generic', '/anything')).toBe(true);
  });
});

describe('extractAmazon (guards site selectors)', () => {
  beforeEach(() =>
    setBody(`
      <span id="productTitle">Sony WH-1000XM6</span>
      <div id="corePrice_feature_div"><span class="a-offscreen">$399.00</span></div>
      <span class="a-price a-text-price"><span class="a-offscreen">$449.00</span></span>
      <span id="acrCustomerReviewText">1,284 ratings</span>
      <div data-hook="review">
        <span data-hook="review-title">Great</span>
        <span data-hook="review-body">Fantastic noise cancelling, used daily for months and love it.</span>
        <i data-hook="review-star-rating">5.0 out of 5 stars</i>
        <span data-hook="avp-badge">Verified Purchase</span>
      </div>`),
  );
  it('reads title, price, list price, rating count and a verified review', () => {
    const r = extractAmazon(document);
    expect(r.title).toBe('Sony WH-1000XM6');
    expect(r.price).toEqual({ amount: 399, currency: 'USD' });
    expect(r.listPrice).toBe(449);
    expect(r.rating?.count).toBe(1284);
    expect(r.reviews?.[0]).toMatchObject({ rating: 5, verified: true });
  });
});

describe('extractGeneric (schema.org + OpenGraph, no bespoke selectors)', () => {
  it('reads a schema.org/Product JSON-LD block', () => {
    setBody(`
      <script type="application/ld+json">
      { "@type": "Product", "name": "Toyota RAV4",
        "offers": { "@type": "Offer", "price": "2895000", "priceCurrency": "INR" },
        "aggregateRating": { "ratingValue": "4.5", "reviewCount": "320" } }
      </script>`);
    const r = extractGeneric(document);
    expect(r.title).toBe('Toyota RAV4');
    expect(r.price).toEqual({ amount: 2895000, currency: 'INR' });
    expect(r.rating?.average).toBe(4.5);
    expect(r.rating?.count).toBe(320);
  });

  it('falls back to OpenGraph meta tags', () => {
    document.body.innerHTML = '';
    document.head.innerHTML = `
      <meta property="og:title" content="Nike Pegasus 41" />
      <meta property="product:price:amount" content="11995" />
      <meta property="product:price:currency" content="INR" />`;
    const r = extractGeneric(document);
    expect(r.title).toBe('Nike Pegasus 41');
    expect(r.price).toEqual({ amount: 11995, currency: 'INR' });
  });
});

describe('extractProduct (orchestration)', () => {
  it('works on a generic site via JSON-LD and names the retailer', () => {
    setBody(`
      <script type="application/ld+json">
      { "@type": "Product", "name": "Herman Miller Aeron",
        "offers": { "price": "1395", "priceCurrency": "USD" } }
      </script>`);
    const p = extractProduct(document, 'www.wayfair.com', 'https://www.wayfair.com/x');
    expect(p).not.toBeNull();
    expect(p!.title).toBe('Herman Miller Aeron');
    expect(p!.price).toEqual({ amount: 1395, currency: 'USD' });
    expect(p!.retailer).toBe('wayfair.com');
  });

  it('returns null when there is no usable product title', () => {
    setBody('<div>Just a homepage</div>');
    expect(extractProduct(document, 'www.example.com')).toBeNull();
  });
});
