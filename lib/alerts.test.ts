import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@/lib/storage';

// Unique product names per test keep the shared in-memory store isolated.
const p = (name: string) => `${name} ${Math.random().toString(36).slice(2)}`;

describe('price alerts (storage)', () => {
  beforeEach(async () => {
    await storage.raw.set('local', 'alerts', []);
  });

  it('creates, finds and removes an alert (case-insensitive match)', async () => {
    const name = p('Toyota RAV4');
    await storage.setAlert(name, 2800000, 'INR');
    expect((await storage.findAlert(name.toUpperCase()))?.targetPrice).toBe(2800000);
    await storage.removeAlert(name);
    expect(await storage.findAlert(name)).toBeNull();
  });

  it('triggers only when an observed price is at/below target, once', async () => {
    const name = p('Nike Pegasus');
    await storage.setAlert(name, 10000, 'INR');

    // Above target → no trigger, but lastPrice is recorded.
    expect(await storage.checkAlerts(name, 11995, 'INR')).toBeNull();
    expect((await storage.findAlert(name))?.lastPrice).toBe(11995);

    // At/below target → newly triggered (returns the alert).
    const fired = await storage.checkAlerts(name, 9499, 'INR');
    expect(fired).not.toBeNull();
    expect(fired?.triggeredPrice).toBe(9499);

    // Does not re-trigger on a subsequent low price.
    expect(await storage.checkAlerts(name, 9000, 'INR')).toBeNull();
    expect((await storage.findAlert(name))?.triggeredAt).toBeTruthy();
  });

  it('resets triggered state when the target is changed', async () => {
    const name = p('LG OLED');
    await storage.setAlert(name, 100000, 'INR');
    await storage.checkAlerts(name, 95000, 'INR'); // triggers
    expect((await storage.findAlert(name))?.triggeredAt).toBeTruthy();
    await storage.setAlert(name, 90000, 'INR'); // new target → fresh watch
    expect((await storage.findAlert(name))?.triggeredAt).toBeUndefined();
  });

  it('checkAlerts is a no-op when no alert exists for the product', async () => {
    expect(await storage.checkAlerts(p('Unwatched'), 1, 'USD')).toBeNull();
  });
});
