import type { PriceAlert } from '@/lib/storage';

/**
 * Fire a desktop notification when a price alert triggers. Best-effort: no-ops when the
 * notifications API isn't available (e.g. the gallery preview or a denied permission), so callers
 * never need to guard. The in-app alerts list is the always-present fallback surface.
 */
export function notifyPriceDrop(alert: PriceAlert): void {
  try {
    const price = alert.triggeredPrice ?? alert.lastPrice ?? alert.targetPrice;
    const money = `${alert.currency} ${price.toLocaleString()}`;
    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      chrome.notifications.create(`buywise-alert:${alert.product}`, {
        type: 'basic',
        iconUrl: chrome.runtime?.getURL ? chrome.runtime.getURL('icons/128.png') : 'icons/128.png',
        title: 'BuyWise price alert',
        message: `${alert.product} hit ${money} — at or below your ${alert.currency} ${alert.targetPrice.toLocaleString()} target.`,
        priority: 2,
      });
    }
  } catch {
    /* notifications are best-effort */
  }
}
