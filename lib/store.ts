import { create } from 'zustand';
import type { Verdict, Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';
import { storage } from '@/lib/storage';
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
  history: ['iPhone 17 Pro', 'Dyson V15', 'LG C4 OLED'],
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
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error }),
  setAnalyzeStage: (analyzeStage) => set({ analyzeStage }),
  setRegion: (region) => {
    set({ region });
    void storage.saveSettings({ region });
  },
  setResultMeta: ({ coverage, sources, grounded }) => set({ coverage, sources, grounded }),
}));
