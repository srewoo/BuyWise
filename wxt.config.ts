import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// BuyWise — standalone MV3 Chrome extension (no backend).
// The background SW calls OpenAI + live sources directly; host_permissions grant CORS-free fetch.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  outDir: 'output',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'BuyWise — Buying Advisor',
    description:
      'AI buying advisor: instant Buy / Consider / Skip verdict from real reviews, deals, and community sentiment.',
    version: '0.1.0',
    minimum_chrome_version: '116',
    // Minimal permissions: only what the code actually uses.
    //  - sidePanel: the whole UI; tabs: scope the panel to one tab + read active tab for prefill;
    //    storage: persist keys/prefs/cache locally. (no `scripting` — the content script is
    //    statically declared via content_scripts and needs no scripting permission.)
    permissions: ['sidePanel', 'tabs', 'storage'],
    // Only hosts the extension itself fetches from. Amazon/Flipkart are NOT here — the content
    // script reads those pages via its own `matches`, which doesn't need a host permission.
    host_permissions: [
      'https://api.openai.com/*',
      'https://www.googleapis.com/*',
      'https://www.reddit.com/*',
      'https://api.perplexity.ai/*',
    ],
    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
    action: {
      default_title: 'Open BuyWise',
      default_icon: {
        16: 'icons/16.png',
        32: 'icons/32.png',
        48: 'icons/48.png',
        128: 'icons/128.png',
      },
    },
    side_panel: { default_path: 'sidepanel.html' },
  },
});
