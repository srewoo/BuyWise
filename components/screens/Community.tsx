import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, SourceIcon, SOURCE_META, Eyebrow } from '@/components/ui';
import type { SourceSentiment } from '@/lib/types';

function SentimentBar({ p, n, neg }: { p: number; n: number; neg: number }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full">
      <div className="bg-buy" style={{ width: `${p * 100}%` }} />
      <div className="bg-surface-2" style={{ width: `${n * 100}%` }} />
      <div className="bg-skip" style={{ width: `${neg * 100}%` }} />
    </div>
  );
}

export function Community({
  product,
  community,
  onBack,
}: {
  product: string;
  community: SourceSentiment[];
  onBack?: () => void;
}) {
  return (
    <Panel>
      <AppBar title="Community intelligence" subtitle={product} onBack={onBack} />
      <Body>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-buy" /> Positive</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-surface-2" /> Neutral</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-skip" /> Negative</span>
        </div>

        {community.map((c) => (
          <Card key={c.source} pad>
            <div className="flex items-center gap-3">
              <SourceIcon source={c.source} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{SOURCE_META[c.source].label}</p>
                <p className="text-xs text-muted">{c.label}</p>
              </div>
              <span className="rounded-full bg-buy-soft px-2 py-0.5 text-xs font-bold text-buy">
                {Math.round(c.positive * 100)}%
              </span>
            </div>
            <div className="mt-3">
              <SentimentBar p={c.positive} n={c.neutral} neg={c.negative} />
            </div>
            <p className="mt-2.5 text-[13px] leading-snug text-ink/80">{c.takeaway}</p>
            <p className="mt-1.5 text-[11px] text-faint">Based on {c.sampleSize.toLocaleString()} sources</p>
          </Card>
        ))}
      </Body>
    </Panel>
  );
}
