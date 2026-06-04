import { useEffect, useState } from 'react';
import { Wallet, Heart, Clock, ChevronRight, Check } from 'lucide-react';
import { BrandBar } from '@/components/Shell';
import { Card, Eyebrow } from '@/components/ui';
import { storage, DEFAULT_SETTINGS, type Settings as S } from '@/lib/storage';
import { getRegion, detectRegion } from '@/lib/regions';

const BRAND_OPTIONS = ['Apple', 'Samsung', 'Sony', 'OnePlus', 'Xiaomi', 'Bose', 'Dyson', 'LG', 'Nothing', 'Google'];

const SYMBOL: Record<string, string> = { USD: '$', INR: '₹', GBP: '£', EUR: '€' };

const BUDGETS: Record<string, { label: string; v: number }[]> = {
  INR: [
    { label: '≤ ₹20k', v: 20000 },
    { label: '₹20–50k', v: 50000 },
    { label: '₹50k–1L', v: 100000 },
    { label: '₹1L+', v: 200000 },
    { label: 'No limit', v: 0 },
  ],
  USD: [
    { label: '≤ $300', v: 300 },
    { label: '$300–600', v: 600 },
    { label: '$600–1200', v: 1200 },
    { label: '$1200+', v: 2500 },
    { label: 'No limit', v: 0 },
  ],
};

export function Profile({ history = [] }: { history?: string[] }) {
  const [s, setS] = useState<S>(DEFAULT_SETTINGS);
  useEffect(() => {
    void storage.getSettings().then(setS);
  }, []);

  const patch = (p: Partial<S>) => {
    setS((prev) => ({ ...prev, ...p }));
    void storage.saveSettings(p);
  };

  const regionCode = s.region || detectRegion();
  const currency = getRegion(regionCode).currency;
  const budgets = BUDGETS[currency] ?? BUDGETS.USD!;
  const toggleBrand = (b: string) =>
    patch({ brands: s.brands.includes(b) ? s.brands.filter((x) => x !== b) : [...s.brands, b] });

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      <BrandBar />
      <div className="flex flex-col gap-4 p-4">
        {/* identity */}
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#3b82f6] to-primary-600 text-xl font-bold text-white">
            S
          </div>
          <div>
            <p className="text-lg font-bold text-ink">Your advisor</p>
            <p className="text-sm text-muted">Verdicts are tuned to these preferences</p>
          </div>
        </div>

        {/* budget */}
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Wallet size={15} className="text-primary" /> Budget ceiling
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {budgets.map((b) => {
              const active = s.budgetMax === b.v;
              return (
                <button
                  key={b.label}
                  onClick={() => patch({ budgetMax: b.v })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-bg text-muted hover:border-primary/40'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* preferred brands */}
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Heart size={15} className="text-primary" /> Preferred brands
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BRAND_OPTIONS.map((b) => {
              const active = s.brands.includes(b);
              return (
                <button
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-bg text-muted hover:border-primary/40'
                  }`}
                >
                  {active && <Check size={12} />} {b}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="border-primary/20 bg-primary-soft">
          <p className="text-[13px] text-ink/85">
            {s.budgetMax || s.brands.length
              ? `Verdicts now weight ${s.brands.length ? s.brands.slice(0, 3).join(', ') : 'value'}${
                  s.budgetMax ? ` and your ${SYMBOL[currency] ?? ''}${s.budgetMax.toLocaleString()} budget` : ''
                } when scoring this product for you.`
              : 'Pick a budget and brands above and BuyWise will factor them into every verdict.'}
          </p>
        </Card>

        {/* history */}
        {history.length > 0 && (
          <div className="flex flex-col gap-1">
            <Eyebrow>
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Search history
              </span>
            </Eyebrow>
            <div className="mt-1 overflow-hidden rounded-2xl border border-line">
              {history.map((h, i) => (
                <button
                  key={h}
                  className={`flex w-full items-center gap-2 px-3.5 py-3 text-left hover:bg-surface ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <span className="flex-1 text-sm text-ink">{h}</span>
                  <ChevronRight size={15} className="text-faint" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
