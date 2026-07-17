/**
 * Category intelligence — a small, dependency-free classifier that maps any product query to a
 * retail category, then supplies category-tuned signals used across BuyWise:
 *   - subreddits / expertSites → deepen and target the evidence gathered per category
 *   - queryTerms                → sharpen review searches
 *   - keyFactLabels             → the structured fields the verdict should surface for THIS category
 *
 * Heuristic (keyword) classification on purpose: it runs instantly, offline, before any LLM call,
 * so the source layer can target the right forums/expert sites up front. `general` is the honest
 * fallback when nothing matches.
 */
export interface CategoryProfile {
  id: string;
  label: string;
  /** Enthusiast/owner communities that deepen discussion evidence for this category. */
  subreddits: string[];
  /** Expert / owner-review domains to scope web research toward. */
  expertSites: string[];
  /** Extra terms appended to review searches to raise relevance. */
  queryTerms: string[];
  /** Category-appropriate structured facts a buyer actually weighs (drives the verdict schema). */
  keyFactLabels: string[];
}

const CATEGORIES: { profile: CategoryProfile; match: RegExp }[] = [
  {
    match: /\b(car|suv|sedan|hatchback|truck|pickup|ev|electric vehicle|motorcycle|bike|scooter|hyundai|toyota|honda|tata|mahindra|kia|ford|bmw|audi|maruti|jeep|nissan|venue|creta|nexon|swift)\b/i,
    profile: {
      id: 'vehicles',
      label: 'Vehicles',
      subreddits: ['cars', 'whatcarshouldIbuy', 'MechanicAdvice'],
      expertSites: ['edmunds.com', 'caranddriver.com', 'team-bhp.com', 'carwale.com', 'cardekho.com', 'autocarindia.com'],
      queryTerms: ['long term review', 'reliability', 'ownership'],
      keyFactLabels: ['On-road / sticker price', 'Real-world mileage', 'Service & maintenance cost', 'Resale value', 'Safety rating', 'Warranty'],
    },
  },
  {
    match: /\b(phone|smartphone|iphone|galaxy|pixel|oneplus|android|mobile|5g)\b/i,
    profile: {
      id: 'phones',
      label: 'Smartphones',
      subreddits: ['Android', 'apple', 'PickAnAndroidForMe'],
      expertSites: ['gsmarena.com', 'theverge.com', 'rtings.com', 'dxomark.com'],
      queryTerms: ['review', 'battery life', 'camera'],
      keyFactLabels: ['Price', 'Battery life', 'Camera quality', 'Performance', 'Display', 'Software support years'],
    },
  },
  {
    match: /\b(laptop|macbook|notebook|ultrabook|chromebook|pc|desktop|gpu|cpu|graphics card|motherboard|ram|ssd)\b/i,
    profile: {
      id: 'computers',
      label: 'Computers & components',
      subreddits: ['laptops', 'buildapc', 'hardware', 'SuggestALaptop'],
      expertSites: ['notebookcheck.net', 'rtings.com', 'tomshardware.com', 'pcmag.com'],
      queryTerms: ['review', 'benchmark', 'thermals'],
      keyFactLabels: ['Price', 'Performance', 'Battery life', 'Build & weight', 'Display', 'Ports & upgradability'],
    },
  },
  {
    match: /\b(tv|television|oled|qled|monitor|projector|soundbar)\b/i,
    profile: {
      id: 'home-entertainment',
      label: 'TVs & home entertainment',
      subreddits: ['4kTV', 'hometheater', 'Monitors'],
      expertSites: ['rtings.com', 'tomsguide.com', 'cnet.com'],
      queryTerms: ['review', 'picture quality', 'input lag'],
      keyFactLabels: ['Price', 'Picture quality', 'Brightness', 'Smart platform', 'Gaming features', 'Sound'],
    },
  },
  {
    match: /\b(headphones?|earbuds?|earphones?|iem|airpods|speakers?|headset)\b/i,
    profile: {
      id: 'audio',
      label: 'Audio',
      subreddits: ['headphones', 'BudgetAudiophile', 'airpods'],
      expertSites: ['rtings.com', 'soundguys.com', 'whathifi.com'],
      queryTerms: ['review', 'sound quality', 'comfort'],
      keyFactLabels: ['Price', 'Sound quality', 'Noise cancellation', 'Comfort & fit', 'Battery life', 'Call quality'],
    },
  },
  {
    match: /\b(fridge|refrigerator|washing machine|washer|dryer|dishwasher|microwave|air ?conditioner|\bac\b|vacuum|dyson|oven|geyser|water purifier)\b/i,
    profile: {
      id: 'appliances',
      label: 'Home appliances',
      subreddits: ['BuyItForLife', 'appliances', 'HomeImprovement'],
      expertSites: ['consumerreports.org', 'rtings.com', 'cnet.com'],
      queryTerms: ['review', 'reliability', 'energy'],
      keyFactLabels: ['Price', 'Energy efficiency', 'Capacity', 'Reliability', 'Noise level', 'Warranty & service'],
    },
  },
  {
    match: /\b(shoe|sneaker|running shoe|boot|trainer|cleat|loafer|heels|sandals|nike|adidas|puma|new balance)\b/i,
    profile: {
      id: 'footwear',
      label: 'Footwear',
      subreddits: ['running', 'Sneakers', 'goodyearwelt', 'BuyItForLife'],
      expertSites: ['runrepeat.com', 'roadrunnersports.com', 'believeintherun.com'],
      queryTerms: ['review', 'fit', 'durability'],
      keyFactLabels: ['Price', 'Fit & sizing', 'Comfort', 'Durability', 'Cushioning / support', 'Use case'],
    },
  },
  {
    match: /\b(shirt|t-?shirt|jeans|jacket|dress|hoodie|trousers|pants|clothing|apparel|levis|zara|coat|sweater)\b/i,
    profile: {
      id: 'apparel',
      label: 'Apparel',
      subreddits: ['malefashionadvice', 'femalefashionadvice', 'BuyItForLife'],
      expertSites: ['wirecutter.com', 'esquire.com', 'gq.com'],
      queryTerms: ['review', 'fit', 'quality'],
      keyFactLabels: ['Price', 'Fit & sizing', 'Fabric & quality', 'Durability', 'Care', 'Value'],
    },
  },
  {
    match: /\b(watch|smartwatch|rolex|omega|garmin|fitbit|apple watch|sunglasses|wallet|handbag|backpack)\b/i,
    profile: {
      id: 'accessories',
      label: 'Watches & accessories',
      subreddits: ['Watches', 'watchexchange', 'BuyItForLife'],
      expertSites: ['hodinkee.com', 'wirecutter.com', 'ablogtowatch.com'],
      queryTerms: ['review', 'quality', 'build'],
      keyFactLabels: ['Price', 'Build quality', 'Materials', 'Comfort', 'Features', 'Resale / longevity'],
    },
  },
  {
    match: /\b(sofa|couch|mattress|bed|chair|desk|table|furniture|wardrobe|recliner|aeron)\b/i,
    profile: {
      id: 'furniture',
      label: 'Furniture',
      subreddits: ['BuyItForLife', 'HomeImprovement', 'Mattress'],
      expertSites: ['wirecutter.com', 'consumerreports.org', 'sleepfoundation.org'],
      queryTerms: ['review', 'comfort', 'durability'],
      keyFactLabels: ['Price', 'Comfort', 'Build & materials', 'Durability', 'Assembly', 'Warranty'],
    },
  },
  {
    match: /\b(cream|serum|shampoo|makeup|lipstick|foundation|moisturizer|sunscreen|perfume|skincare|cosmetic)\b/i,
    profile: {
      id: 'beauty',
      label: 'Beauty & personal care',
      subreddits: ['SkincareAddiction', 'MakeupAddiction', 'AsianBeauty'],
      expertSites: ['byrdie.com', 'incidecoder.com', 'allure.com'],
      queryTerms: ['review', 'ingredients', 'results'],
      keyFactLabels: ['Price', 'Key ingredients', 'Effectiveness', 'Skin/hair type fit', 'Irritation risk', 'Value per use'],
    },
  },
  {
    match: /\b(drink|soda|cola|juice|coffee|tea|water|snack|chocolate|chips|cereal|protein|supplement|food|beverage|coke|pepsi)\b/i,
    profile: {
      id: 'food-beverage',
      label: 'Food & beverage',
      subreddits: ['nutrition', 'Coffee', 'snacks'],
      expertSites: ['healthline.com', 'eatthis.com', 'consumerreports.org'],
      queryTerms: ['review', 'taste', 'nutrition'],
      keyFactLabels: ['Price (per unit / litre)', 'Taste', 'Nutrition / sugar', 'Ingredients', 'Health considerations', 'Value'],
    },
  },
];

const GENERAL: CategoryProfile = {
  id: 'general',
  label: 'General',
  subreddits: ['BuyItForLife', 'reviews'],
  expertSites: ['wirecutter.com', 'consumerreports.org', 'rtings.com'],
  queryTerms: ['review', 'worth it', 'pros and cons'],
  keyFactLabels: ['Price', 'Build quality', 'Reliability', 'Ease of use', 'Value for money', 'Warranty'],
};

/** Classify a product query into a retail category. Never throws; falls back to `general`. */
export function classifyCategory(product: string): CategoryProfile {
  const q = ` ${product.toLowerCase()} `;
  for (const c of CATEGORIES) {
    if (c.match.test(q)) return c.profile;
  }
  return GENERAL;
}
