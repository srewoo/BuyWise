import { ShieldCheck, Bot, Copy, Gift, Factory } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Ring, Eyebrow, CountUp } from '@/components/ui';
import type { TrustBreakdown } from '@/lib/types';

export function Trust({
  product,
  trust,
  onBack,
}: {
  product: string;
  trust: TrustBreakdown;
  onBack?: () => void;
}) {
  const ringColor = trust.score >= 80 ? '#059669' : trust.score >= 60 ? '#d97706' : '#dc2626';
  const flags = [
    { icon: Factory, label: 'Review farms', n: trust.flagged.reviewFarms },
    { icon: Bot, label: 'Bot patterns', n: trust.flagged.botPatterns },
    { icon: Copy, label: 'Duplicates', n: trust.flagged.duplicates },
    { icon: Gift, label: 'Incentivized', n: trust.flagged.incentivized },
  ];
  const totalFlagged = flags.reduce((s, f) => s + f.n, 0);
  return (
    <Panel>
      <AppBar title="Trust score" subtitle={product} onBack={onBack} />
      <Body>
        <Card className="items-center">
          <div className="flex flex-col items-center py-1">
            <Ring value={trust.score / 100} size={132} stroke={11} color={ringColor}>
              <div className="text-center">
                <p className="text-3xl font-bold text-ink">
                  <CountUp to={trust.score} />
                </p>
                <p className="-mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">/ 100</p>
              </div>
            </Ring>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-buy">
              <ShieldCheck size={16} /> Highly authentic
            </p>
          </div>
        </Card>

        <Card className="bg-surface">
          <p className="text-[13px] leading-relaxed text-ink/85">{trust.note}</p>
        </Card>

        <div className="flex flex-col gap-1">
          <Eyebrow>Filtered before analysis · {totalFlagged} flagged</Eyebrow>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {flags.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.label} pad className="bg-surface">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-skip-soft text-skip">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-lg font-bold leading-none text-ink">{f.n}</p>
                      <p className="text-[11px] text-muted">{f.label}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="border-buy/20 bg-buy-soft/50">
          <p className="text-sm">
            <span className="font-bold text-buy">{trust.authenticReviews.toLocaleString()}</span>
            <span className="text-ink/80"> authentic reviews used to build this verdict.</span>
          </p>
        </Card>
      </Body>
    </Panel>
  );
}
