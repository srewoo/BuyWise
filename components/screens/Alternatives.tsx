import { ArrowRight, Camera, BatteryFull, BadgeDollarSign, Sparkles } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Pill, Eyebrow } from '@/components/ui';
import { VERDICT_META, type Alternative } from '@/lib/types';

const ANGLE_ICON: Record<string, typeof Camera> = {
  'Best camera': Camera,
  'Best battery': BatteryFull,
  'Best value': BadgeDollarSign,
  'Best comfort': Sparkles,
  'Best for Apple': Sparkles,
};

export function Alternatives({
  product,
  alternatives,
  onAnalyze,
  onBack,
}: {
  product: string;
  alternatives: Alternative[];
  onAnalyze?: (name: string) => void;
  onBack?: () => void;
}) {
  return (
    <Panel>
      <AppBar title="Alternatives" subtitle={`If you’re weighing up ${product}`} onBack={onBack} />
      <Body>
        <Eyebrow>Worth comparing</Eyebrow>
        {alternatives.map((a) => {
          const Icon = ANGLE_ICON[a.angle] ?? Sparkles;
          const meta = VERDICT_META[a.decision];
          return (
            <Card key={a.name} pad>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon size={17} />
                </span>
                <Pill tone="primary">{a.angle}</Pill>
                <span className="flex-1" />
                <Pill tone={a.decision}>{meta.label}</Pill>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <p className="text-base font-bold text-ink">{a.name}</p>
                {a.priceHint && <p className="text-sm font-semibold text-muted">{a.priceHint}</p>}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink/80">{a.reason}</p>
              <button
                onClick={() => onAnalyze?.(a.name)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface py-2.5 text-sm font-semibold text-primary hover:bg-primary-soft"
              >
                Analyze {a.name} <ArrowRight size={15} />
              </button>
            </Card>
          );
        })}
      </Body>
    </Panel>
  );
}
