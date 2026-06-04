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
    permissions: ['sidePanel', 'tabs', 'storage', 'scripting'],
    host_permissions: [
      'https://api.openai.com/*',
      'https://www.googleapis.com/*',
      'https://www.reddit.com/*',
      'https://oauth.reddit.com/*',
      'https://*.amazon.in/*',
      'https://*.amazon.com/*',
      'https://*.flipkart.com/*',
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
