# BuyWise — Chrome Extension

A **standalone Chrome extension** (Manifest V3) that acts as an AI **purchase-research** advisor for
**anything sold at retail** — a car or a laptop, clothes or shoes, a TV, a home appliance, or a cold
drink — bought **online or in a physical store**. Search any product and get an instant
**Buy / Consider / Skip** verdict with confidence, category-aware pros/cons, community sentiment by
source, deals, a fake-review trust score, Q&A, and alternatives.

- **No backend.** Everything runs in your browser. The side panel calls OpenAI and the live
  sources directly (the extension's `host_permissions` make these cross-origin calls without CORS).
- **Free & unlimited.** No account, no subscription, no server. You only pay your own OpenAI usage.
- **Bring-your-own-key.** You paste your OpenAI key (and optionally a free YouTube key) in Settings;
  keys live only in `chrome.storage` and are sent directly to each provider.

## Two UX guarantees (the hard requirements)

1. **Persistent side panel** — stays open across in-tab navigation.
2. **Opens in one tab only** — the panel opens for the active/clicked tab and never bleeds into
   other tabs. Implemented in `entrypoints/background.ts`: global default disabled, per-tab
   `setOptions({ tabId, enabled })`, `open({ tabId })` inside the toolbar-click user gesture.

## Tech stack

WXT · React 19 · TypeScript (strict) · Tailwind v4 · Framer Motion · Zustand · Zod · Vitest.

## Project layout

```
entrypoints/
  background.ts            one-tab-only persistent side-panel logic + product-detection messaging
  content.ts               optional: auto-prefills search from product pages — rich selectors for
                           Amazon/Flipkart, generic schema.org/OpenGraph reader for other retailers
                           (search works for any product/category regardless)
lib/
  categories.ts            category classifier → per-category forums, expert sites, key-fact labels
  pageExtract.ts           pure, unit-tested page parsers (site-specific + generic JSON-LD/OG)
  notify.ts                best-effort desktop notification for triggered price alerts
  advisor/sources/
    expertAdapter.ts       category-aware expert/forum evidence via live web search
  sidepanel/               the side-panel React app (App.tsx router over the 13 screens)
components/
  screens/                 one component per screen (Welcome, Home, Dashboard, …)
  ui.tsx, Shell.tsx        design-system primitives (Card, Button, Ring, Bar, Sparkline, …)
lib/
  advisor/                 the "engine" (client-side)
    sources/               SourceAdapter + reddit / youtube adapters (graceful degradation)
    orchestrator.ts        parallel gather + per-source timeout + skip logging
    pipeline.ts            GPT-5 call with strict structured outputs → Verdict
    openai.ts              OpenAI client (retry/backoff, timeout)
    schema.ts              strict JSON schema mirroring the Verdict type
  types.ts                 Zod contract (Verdict, ReviewItem, …)
  storage.ts  cache.ts  messaging.ts  mock.ts  store.ts
gallery/                   standalone interactive prototype (preview all screens in a browser)
assets/tailwind.css        design tokens (verdict colors, radii, shadows)
```

## Cost & accounts

| Source | Cost | Account needed |
| --- | --- | --- |
| **OpenAI** (required) | ~$0.02–0.05 per fresh lookup, $0 on 24h cache hits | API key only |
| **YouTube** (optional) | Free (10k units/day ≈ ~90 lookups/day) | Free Google Cloud **API key** — not a Google login |
| **Reddit** (default) | Free, no key | None |
| Retail reviews / live prices / price history | Paid 3rd-party APIs | Their own keys — **never** your Amazon/Google account |

The extension is fully useful with **just an OpenAI key**. Without any key it runs in **demo mode**
(seeded sample verdict) so the UI always works.

## Develop

```bash
npm install
npm run dev          # launch the extension in a dev Chrome (WXT)
npm run build        # production build → output/chrome-mv3
npm run preview      # interactive prototype at http://localhost:5199 (all screens, clickable)
npm run compile      # tsc --noEmit
npm test             # Vitest
```

### Load the built extension

1. `npm run build`
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select
   `output/chrome-mv3`.
3. Click the toolbar icon → the panel opens **only in that tab**. Switch tabs → it's gone.
   Navigate within the tab → it **persists**.
4. Open **Settings**, paste your OpenAI key (+ optional YouTube key), then search a product.
