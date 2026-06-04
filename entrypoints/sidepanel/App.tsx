import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { requestAdvice } from '@/lib/messaging';
import { DEMO_VERDICT } from '@/lib/mock';
import { storage } from '@/lib/storage';
import { detectRegion } from '@/lib/regions';
import { answerQuestion } from '@/lib/advisor/qa';
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

export function App() {
  const {
    screen,
    query,
    verdict,
    history,
    mode,
    error,
    analyzeStage,
    go,
    setQuery,
    setVerdict,
    pushHistory,
    region,
    coverage,
    sources,
    grounded,
    setMode,
    setError,
    setAnalyzeStage,
    setRegion,
    setResultMeta,
  } = useApp();

  // Real flow: gather live sources + run the GPT-5 pipeline (or demo mode without a key).
  async function runSearch(q: string) {
    const product = q.trim();
    if (!product) return;
    setQuery(product);
    pushHistory(product);
    setError(null);
    setAnalyzeStage('collecting');
    go('analyzing');

    // If analyzing the product detected on the current page, ground it in that page's
    // price, rating, and reviews — regardless of whether review bodies have loaded yet.
    const norm = (x: string) => x.trim().toLowerCase();
    const onProduct =
      !!detected &&
      (norm(product) === norm(detected) ||
        norm(detected).includes(norm(product)) ||
        norm(product).includes(norm(detected)));
    const opts = onProduct
      ? {
          seedReviews: pageData.reviews,
          pageUrl: pageData.url,
          pagePrice: pageData.price,
          retailer: pageData.retailer,
          rating: pageData.rating,
        }
      : undefined;

    const started = Date.now();
    const result = await requestAdvice(
      product,
      (p) => {
        if (p.stage !== 'done' && p.stage !== 'cache') setAnalyzeStage(p.stage);
      },
      undefined,
      opts,
    );

    // Ensure the analyzing animation is visible for at least a beat.
    const elapsed = Date.now() - started;
    if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));

    setVerdict(result.verdict);
    setMode(result.mode);
    setError(result.error ?? null);
    setResultMeta({ coverage: result.coverage, sources: result.sources, grounded: result.grounded });
    go('dashboard');
  }

  const v = verdict ?? DEMO_VERDICT;
  const back = () => go('dashboard');

  // Real "detected on this page": ask the background what the content script found on
  // the active tab. Null on non-product pages (e.g. Google), so the banner stays hidden.
  type Prefill = {
    title?: string;
    url?: string;
    reviews?: { title?: string; text: string; rating?: number; verified?: boolean }[];
    price?: { amount: number; currency: string };
    retailer?: string;
    rating?: { average?: number; count?: number };
  };
  const [detected, setDetected] = useState<string | null>(null);
  const [pageData, setPageData] = useState<Prefill>({});
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    const apply = (p: Prefill | null) => {
      if (p && typeof p.title === 'string' && p.title.length > 2) {
        setDetected(p.title);
        setPageData(p);
      }
    };
    chrome.runtime.sendMessage({ type: 'GET_PREFILL' }).then(apply).catch(() => {});
    const onMsg = (m: { type?: string; payload?: Prefill }) => {
      if (m?.type === 'PREFILL') apply(m.payload ?? null);
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  useEffect(() => {
    if (!verdict) setVerdict(DEMO_VERDICT);
  }, [verdict, setVerdict]);

  // Initialise region from saved settings, auto-detecting from locale on first run.
  useEffect(() => {
    void storage.getSettings().then((s) => setRegion(s.region || detectRegion()));
  }, [setRegion]);

  function render(): ReactNode {
    switch (screen) {
      case 'welcome':
        return <Welcome onStart={() => go('home')} />;
      case 'home':
        return <Home history={history} detected={detected} region={region} onRegionChange={setRegion} onSearch={runSearch} onOpenSettings={() => go('settings')} />;
      case 'analyzing':
        return <Analyzing query={query || v.product} stage={analyzeStage} />;
      case 'dashboard':
        return (
          <Dashboard
            v={v}
            mode={mode}
            error={error}
            coverage={coverage}
            sources={sources}
            grounded={grounded}
            onBack={() => go('home')}
            onNav={go}
          />
        );
      case 'pros':
        return <Signals kind="pros" product={v.product} signals={v.pros} onBack={back} />;
      case 'cons':
        return <Signals kind="cons" product={v.product} signals={v.cons} onBack={back} />;
      case 'community':
        return <Community product={v.product} community={v.community} onBack={back} />;
      case 'deals':
        return <Deals product={v.product} deals={v.deals} onBack={back} />;
      case 'trust':
        return <Trust product={v.product} trust={v.trust} onBack={back} />;
      case 'qa':
        return <QA product={v.product} qa={v.qa} onAsk={(q) => answerQuestion(v.product, q, v)} onBack={back} />;
      case 'alternatives':
        return (
          <Alternatives
            product={v.product}
            alternatives={v.alternatives}
            onAnalyze={(name) => runSearch(name)}
            onBack={back}
          />
        );
      case 'profile':
        return <Profile history={history} />;
      case 'settings':
        return <Settings onBack={() => go('home')} />;
      default:
        return <Home history={history} detected={detected} region={region} onRegionChange={setRegion} onSearch={runSearch} onOpenSettings={() => go('settings')} />;
    }
  }

  // Direction-aware: detail screens slide in from the right, "home-ward" fades.
  const isDetail = !['home', 'welcome', 'profile'].includes(screen);
  return (
    <div className="h-full w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          className="h-full w-full"
          initial={{ opacity: 0, x: isDetail ? 24 : 0, y: isDetail ? 0 : 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: isDetail ? -16 : 0, y: isDetail ? 0 : -6 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {render()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
