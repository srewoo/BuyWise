import { describe, it, expect } from 'vitest';
import { classifyCategory } from '@/lib/categories';

describe('classifyCategory', () => {
  it.each([
    ['Hyundai Venue', 'vehicles'],
    ['Toyota RAV4', 'vehicles'],
    ['iPhone 17 Pro', 'phones'],
    ['MacBook Air M4', 'computers'],
    ['LG C4 OLED TV', 'home-entertainment'],
    ['Sony WH-1000XM6 headphones', 'audio'],
    ['Dyson V15 vacuum', 'appliances'],
    ['Nike Pegasus 41 running shoe', 'footwear'],
    ["Levi's 501 jeans", 'apparel'],
    ['Garmin Fenix watch', 'accessories'],
    ['Herman Miller Aeron chair', 'furniture'],
    ['CeraVe moisturizer', 'beauty'],
    ['Coca-Cola Zero drink', 'food-beverage'],
  ])('classifies %s as %s', (product, expected) => {
    expect(classifyCategory(product).id).toBe(expected);
  });

  it('falls back to general for unknown products', () => {
    const c = classifyCategory('Some Obscure Widget 3000');
    expect(c.id).toBe('general');
    expect(c.keyFactLabels.length).toBeGreaterThan(0);
    expect(c.expertSites.length).toBeGreaterThan(0);
  });

  it('every profile carries key-fact labels + expert sites', () => {
    for (const p of ['car', 'phone', 'laptop', 'shoe', 'sofa', 'shampoo', 'cola']) {
      const c = classifyCategory(p);
      expect(c.keyFactLabels.length).toBeGreaterThanOrEqual(4);
      expect(c.expertSites.length).toBeGreaterThan(0);
    }
  });
});
