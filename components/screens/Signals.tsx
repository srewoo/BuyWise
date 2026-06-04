import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Bar, Eyebrow } from '@/components/ui';
import type { Signal } from '@/lib/types';

export function Signals({
  kind,
  product,
  signals,
  onBack,
}: {
  kind: 'pros' | 'cons';
  product: string;
  signals: Signal[];
  onBack?: () => void;
}) {
  const isPro = kind === 'pros';
  const accent = isPro ? 'bg-buy' : 'bg-skip';
  const Icon = isPro ? ThumbsUp : ThumbsDown;
  return (
    <Panel>
      <AppBar title={isPro ? 'Positive signals' : 'Negative signals'} subtitle={product} onBack={onBack} />
      <Body>
        <Card className={isPro ? 'bg-buy-soft/50 border-buy/20' : 'bg-skip-soft/50 border-skip/20'}>
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-xl text-white ${accent}`}>
              <Icon size={20} />
            </span>
            <div>
              <Eyebrow>{isPro ? 'What owners love' : 'What owners complain about'}</Eyebrow>
              <p className="text-sm text-ink/80">
                Ranked by how often & strongly it appears across all sources.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {signals.map((s, i) => (
            <Card key={s.label} pad>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <p className="text-[14px] font-semibold text-ink">{s.label}</p>
                </div>
                {s.mentions != null && (
                  <span className="shrink-0 text-xs font-medium text-faint">{s.mentions} mentions</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Bar value={s.strength} className={accent} />
                <span className="w-9 text-right text-xs font-semibold text-muted">
                  {Math.round(s.strength * 100)}%
                </span>
              </div>
            </Card>
          ))}
        </div>
      </Body>
    </Panel>
  );
}
