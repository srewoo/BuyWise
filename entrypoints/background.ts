/**
 * Background service worker.
 *
 * Implements the two hard UX requirements, verified against the chrome.sidePanel API:
 *  1. PERSISTENT — the panel stays open across in-tab navigation (it's a separate document).
 *  2. ONE TAB ONLY — global default is DISABLED; we enable the panel per-tab on the toolbar
 *     click (a user gesture) and open it for that tab only. Other tabs never show it.
 *
 * Gotchas handled:
 *  - sidePanel.open() must run inside the user gesture → no slow awaits before it.
 *  - open({tabId}) alone leaks across tabs → always pair with per-tab setOptions().
 *  - The SW is ephemeral → enabledTabs is rehydrated from chrome.storage.session.
 */
export default defineBackground(() => {
  const PANEL_PATH = 'sidepanel.html';
  const enabledTabs = new Set<number>();

  async function loadEnabled() {
    const { enabledTabs: saved } = await chrome.storage.session.get('enabledTabs');
    if (Array.isArray(saved)) saved.forEach((id: number) => enabledTabs.add(id));
  }
  const persist = () =>
    chrome.storage.session.set({ enabledTabs: [...enabledTabs] }).catch(() => {});

  void loadEnabled();

  chrome.runtime.onInstalled.addListener(async () => {
    // Default OFF everywhere; we opt tabs in individually.
    await chrome.sidePanel.setOptions({ enabled: false });
    // We open manually (so we can scope to one tab), so disable auto-open-on-click.
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  });

  // Toolbar click = user gesture. Enable + open ONLY this tab. Keep it gesture-safe.
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id == null) return;
    const tabId = tab.id;
    enabledTabs.add(tabId);
    persist();
    // open() first to preserve the gesture, then assert per-tab options.
    chrome.sidePanel.open({ tabId }).catch((e) => console.warn('[BuyWise] open failed', e));
    chrome.sidePanel.setOptions({ tabId, path: PANEL_PATH, enabled: true }).catch(() => {});
  });

  // Keep the panel strictly scoped: only opted-in tabs show it.
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    await chrome.sidePanel
      .setOptions({ tabId, enabled: enabledTabs.has(tabId), path: PANEL_PATH })
      .catch(() => {});
  });

  // Re-assert the path after in-tab navigation so the panel persists on SPA transitions.
  chrome.tabs.onUpdated.addListener(async (tabId, info) => {
    if (info.status === 'complete' && enabledTabs.has(tabId)) {
      await chrome.sidePanel.setOptions({ tabId, enabled: true, path: PANEL_PATH }).catch(() => {});
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    enabledTabs.delete(tabId);
    persist();
  });

  // Cache the last product detected on a tab; the panel can request it on mount.
  const lastProduct = new Map<number, unknown>();
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'PRODUCT_DETECTED' && sender.tab?.id != null) {
      lastProduct.set(sender.tab.id, msg.payload);
      chrome.runtime.sendMessage({ type: 'PREFILL', payload: msg.payload }).catch(() => {});
    }
    if (msg?.type === 'GET_PREFILL') {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
        sendResponse(t?.id != null ? lastProduct.get(t.id) ?? null : null);
      });
      return true; // async response
    }
    return undefined;
  });
});
