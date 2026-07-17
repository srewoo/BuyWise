import { create } from 'zustand';
import type { Verdict, Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';
import { storage, type PriceAlert } from '@/lib/storage';
import { DEFAULT_REGION } from '@/lib/regions';

export type Screen =
  | 'welcome'
  | 'home'
  | 'analyzing'
  | 'dashboard'
  | 'pros'
  | 'cons'
  | 'community'
  | 'deals'
  | 'trust'
  | 'qa'
  | 'alternatives'
  | 'profile'
  | 'settings';

export type AdviseMode = 'live' | 'demo' | 'cached' | null;

interface AppState {
  screen: Screen;
  query: string;
  verdict: Verdict | null;
  history: string[];
  alerts: PriceAlert[];
  mode: AdviseMode;
  error: string | null;
  analyzeStage: string;
  region: string;
  coverage: Coverage[];
  sources: Citation[];
  grounded: boolean;
  go: (s: Screen) => void;
  setQuery: (q: string) => void;
  setVerdict: (v: Verdict | null) => void;
  pushHistory: (q: string) => void;
  removeHistory: (q: string) => void;
  loadAlerts: () => void;
  setAlert: (product: string, targetPrice: number, currency: string) => void;
  removeAlert: (product: string) => void;
  setMode: (m: AdviseMode) => void;
  setError: (e: string | null) => void;
  setAnalyzeStage: (s: string) => void;
  setRegion: (code: string) => void;
  setResultMeta: (m: { coverage: Coverage[]; sources: Citation[]; grounded: boolean }) => void;
}

export const useApp = create<AppState>((set) => ({
  screen: 'home',
  query: '',
  verdict: null,
  history: ['iPhone 17 Pro', 'Toyota RAV4', "Levi's 501"],
  alerts: [],
  mode: null,
  error: null,
  analyzeStage: 'collecting',
  region: DEFAULT_REGION,
  coverage: [],
  sources: [],
  grounded: false,
  go: (screen) => set({ screen }),
  setQuery: (query) => set({ query }),
  setVerdict: (verdict) => set({ verdict }),
  pushHistory: (q) =>
    set((s) => ({ history: [q, ...s.history.filter((h) => h !== q)].slice(0, 8) })),
  removeHistory: (q) => {
    set((s) => ({ history: s.history.filter((h) => h !== q) }));
    void storage.removeHistory(q);
  },
  loadAlerts: () => {
    void storage.getAlerts().then((alerts) => set({ alerts }));
  },
  setAlert: (product, targetPrice, currency) => {
    void storage.setAlert(product, targetPrice, currency).then(() => storage.getAlerts()).then((alerts) => set({ alerts }));
  },
  removeAlert: (product) => {
    void storage.removeAlert(product).then((alerts) => set({ alerts }));
  },
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error }),
  setAnalyzeStage: (analyzeStage) => set({ analyzeStage }),
  setRegion: (region) => {
    set({ region });
    void storage.saveSettings({ region });
  },
  setResultMeta: ({ coverage, sources, grounded }) => set({ coverage, sources, grounded }),
}));
