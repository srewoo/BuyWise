import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/tailwind.css';

import { useApp, type Screen } from '@/lib/store';
import { App } from '@/entrypoints/sidepanel/App';
import { DEMO_VERDICT as v } from '@/lib/mock';
import type { Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';

const SAMPLE_COVERAGE: Coverage[] = [
  { source: 'reddit', name: 'reddit-public-json', status: 'ok', count: 8 },
  { source: 'youtube', name: 'youtube-data-v3', status: 'ok', count: 14 },
  { source: 'expert', name: 'expert-rss', status: 'skipped', reason: 'no_results', count: 0 },
];
const SAMPLE_CITES: Citation[] = [
  { source: 'reddit', title: 'Sony WH-1000XM6 — 3 months later, still the ANC king', url: 'https://reddit.com' },
  { source: 'youtube', title: 'XM6 review: the best noise cancelling you can buy?', url: 'https://youtube.com' },
  { source: 'reddit', title: 'XM6 vs Bose QC Ultra — which did you keep?', url: 'https://reddit.com' },
  { source: 'youtube', title: 'Long-term battery & call-quality test', url: 'https://youtube.com' },
];
import { Welcome } from '@/components/screens/Welcome';
import { Home } from '@/components/screens/Home';
import { Analyzing } from '@/components/screens/Analyzing';
import { Dashboard } from '@/components/screens/Dashboard';
import { Signals } from '@/components/screens/Signals';
import { Community } from '@/components/screens/Community';
import { Deals } from '@/components/screens/Deals';
import { Trust } from '@/components/screens/Trust';
import { QA } from '@/components/screens/QA';
import { Alternatives } from '@/components/screens/Alternatives';
import { Profile } from '@/components/screens/Profile';
import { Settings } from '@/components/screens/Settings';

function Device({ children }: { children: ReactNode }) {
  return (
    <div className="h-[800px] w-[400px] shrink-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      {children}
    </div>
  );
}

const JUMP: { s: Screen; label: string }[] = [
  { s: 'welcome', label: 'Welcome' },
  { s: 'home', label: 'Home' },
  { s: 'analyzing', label: 'Analyzing' },
  { s: 'dashboard', label: 'Dashboard' },
  { s: 'pros', label: 'Pros' },
  { s: 'cons', label: 'Cons' },
  { s: 'community', label: 'Community' },
  { s: 'deals', label: 'Deals' },
  { s: 'trust', label: 'Trust' },
  { s: 'qa', label: 'Q&A' },
  { s: 'alternatives', label: 'Alternatives' },
  { s: 'profile', label: 'Profile' },
  { s: 'settings', label: 'Settings' },
];

function Jumper() {
  const { screen, go, setVerdict } = useApp();
  return (
    <div className="flex max-w-[340px] flex-wrap gap-1.5">
      {JUMP.map((j) => (
        <button
          key={j.s}
          onClick={() => {
            setVerdict({ ...v });
            go(j.s);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            screen === j.s
              ? 'bg-blue-600 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {j.label}
        </button>
      ))}
    </div>
  );
}

function Frame({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5" id={`screen-${n}`}>
      <p className="text-[13px] font-semibold text-slate-600">
        <span className="mr-1.5 text-slate-400">{String(n).padStart(2, '0')}</span>
        {title}
      </p>
      <div className="panel-frame h-[800px] w-[400px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
        {children}
      </div>
    </div>
  );
}

const SCREENS: { title: string; node: ReactNode }[] = [
  { title: 'Welcome / first-run', node: <Welcome /> },
  { title: 'Home / Search', node: <Home detected="Sony WH-1000XM6" /> },
  { title: 'Analyzing', node: <Analyzing query={v.product} /> },
  {
    title: 'Verdict Dashboard',
    node: <Dashboard v={v} mode="live" coverage={SAMPLE_COVERAGE} sources={SAMPLE_CITES} grounded />,
  },
  { title: 'Positive signals (Pros)', node: <Signals kind="pros" product={v.product} signals={v.pros} /> },
  { title: 'Negative signals (Cons)', node: <Signals kind="cons" product={v.product} signals={v.cons} /> },
  { title: 'Community Intelligence', node: <Community product={v.product} community={v.community} /> },
  { title: 'Deal Finder', node: <Deals product={v.product} deals={v.deals} /> },
  { title: 'Trust Score', node: <Trust product={v.product} trust={v.trust} /> },
  { title: 'Q&A', node: <QA product={v.product} qa={v.qa} /> },
  { title: 'Alternatives', node: <Alternatives product={v.product} alternatives={v.alternatives} /> },
  { title: 'Profile / Advisor', node: <Profile /> },
  { title: 'Settings', node: <Settings /> },
];

function Gallery() {
  return (
    <div className="min-h-screen bg-slate-100 px-10 py-10">
      <header className="mx-auto mb-8 max-w-[1400px]">
        <h1 className="text-2xl font-bold text-slate-900">BuyWise — Interactive Prototype</h1>
        <p className="text-sm text-slate-500">
          Click through the live side panel · 13 screens · Claude-designed · 100% free
        </p>
      </header>

      {/* interactive device */}
      <section className="mx-auto mb-12 flex max-w-[1400px] flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-start">
        <Device>
          <App />
        </Device>
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Try it — jump to any screen
          </p>
          <Jumper />
          <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-slate-500">
            Or use the real flow: on <b>Home</b>, click a product (or “Detected on this page”) to watch the
            analysis run and land on the verdict. Use the tiles on the dashboard to explore evidence; the
            back arrow returns you.
          </p>
        </div>
      </section>

      {/* static reference grid */}
      <header className="mx-auto mb-5 max-w-[1400px]">
        <h2 className="text-lg font-bold text-slate-900">All screens</h2>
      </header>
      <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-10 gap-y-12">
        {SCREENS.map((s, i) => (
          <Frame key={s.title} n={i + 1} title={s.title}>
            {s.node}
          </Frame>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
