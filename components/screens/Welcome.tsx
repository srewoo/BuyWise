import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import logoUrl from '@/assets/logo.png';

const STEPS = [
  { c: 'bg-buy', ch: 'B', t: 'Buy', d: 'Strong consensus — go for it.' },
  { c: 'bg-consider', ch: 'C', t: 'Consider', d: 'Mixed signals — weigh trade-offs.' },
  { c: 'bg-skip', ch: 'S', t: 'Skip', d: 'Recurring complaints — hold off.' },
];

export function Welcome({ onStart }: { onStart?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-bg">
      {/* hero */}
      <div className="flex flex-col items-center gap-3.5 bg-gradient-to-br from-[#3b82f6] to-primary-600 px-7 pb-9 pt-12 text-center">
        <div className="grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-[22px] bg-white p-2 shadow-lg">
          <img src={logoUrl} alt="BuyWise" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-[26px] font-bold text-white">BuyWise</h1>
        <p className="max-w-[300px] text-sm text-primary-soft">
          Should you buy it? An instant AI verdict on anything — cars, gadgets, clothes, shoes, groceries —
          from thousands of real reviews, in seconds.
        </p>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-[18px] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">How it works</p>
        {STEPS.map((s) => (
          <div key={s.t} className="flex items-center gap-3">
            <div className={`grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-white ${s.c}`}>
              {s.ch}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink">{s.t}</p>
              <p className="text-[13px] text-muted">{s.d}</p>
            </div>
          </div>
        ))}

        <div className="mt-1 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Connect your OpenAI key</p>
          <p className="text-xs text-muted">Stored only in your browser — never sent to us.</p>
          <div className="flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-bg px-3 py-3">
            <input
              type="password"
              placeholder="sk-••••••••••••••••••••••••"
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
            />
            <Lock size={14} className="text-faint" />
          </div>
        </div>

        <Button className="mt-auto w-full" onClick={onStart}>
          Get started <ArrowRight size={16} />
        </Button>
        <button onClick={onStart} className="text-center text-[13px] font-medium text-primary">
          Skip for now · explore demo mode
        </button>
      </div>
    </div>
  );
}
