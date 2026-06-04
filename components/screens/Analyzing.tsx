import { Check, Loader2, MessagesSquare, Globe, ShoppingCart, Brain } from 'lucide-react';
import { BrandBar } from '@/components/Shell';

const STAGES = [
  { icon: ShoppingCart, label: 'Collecting reviews', sub: 'On-page, retail & verified buyers' },
  { icon: MessagesSquare, label: 'Reading discussions', sub: 'Reddit threads & YouTube' },
  { icon: Globe, label: 'Researching the web', sub: 'Planning angles & searching sources' },
  { icon: Brain, label: 'Verifying & analyzing', sub: 'Fact-checking, then the verdict' },
];

// Map an engine stage to "how many steps are complete".
const STEP_FOR: Record<string, number> = {
  collecting: 0,
  discussions: 1,
  planning: 2,
  researching: 2,
  verifying: 3,
  analyzing: 3,
};

export function Analyzing({ query = 'Sony WH-1000XM6', stage = 'collecting' }: { query?: string; stage?: string }) {
  const current = STEP_FOR[stage] ?? 0;
  return (
    <div className="flex h-full flex-col bg-bg">
      <BrandBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16">
        <div className="relative grid place-items-center">
          <span className="absolute h-32 w-32 animate-ping rounded-full bg-primary/20" />
          <span className="absolute h-24 w-24 rounded-full bg-primary/10" />
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-cta)]">
            <Loader2 size={30} className="animate-spin" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Analyzing</p>
          <h2 className="mt-1 text-lg font-bold text-ink">{query}</h2>
          <p className="mt-1 text-sm text-muted">Aggregating across sources… ~15s</p>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          {STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                  active ? 'border-primary/30 bg-primary-soft' : 'border-line bg-surface'
                } ${!done && !active ? 'opacity-50' : ''}`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    done ? 'bg-buy text-white' : active ? 'bg-primary text-white' : 'bg-surface-2 text-faint'
                  }`}
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{s.label}</p>
                  <p className="text-xs text-muted">{s.sub}</p>
                </div>
                {active && <Loader2 size={16} className="animate-spin text-primary" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
