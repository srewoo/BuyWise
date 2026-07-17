import {
  ThumbsUp,
  ThumbsDown,
  Users,
  Tag,
  ShieldCheck,
  MessageCircleQuestion,
  Repeat2,
  ChevronRight,
  ListChecks,
} from 'lucide-react';
import { AppBar, Panel } from '@/components/Shell';
import { Card, Ring, Pill, Eyebrow, CountUp } from '@/components/ui';
import { SourcesCard } from '@/components/SourcesCard';
import { VERDICT_META, type Verdict, type Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';
import type { Screen } from '@/lib/store';

const RING_COLOR: Record<string, string> = {
  buy: '#059669',
  consider: '#d97706',
  skip: '#dc2626',
};

const TILES: { screen: Screen; label: string; icon: typeof Users }[] = [
  { screen: 'pros', label: 'Pros', icon: ThumbsUp },
  { screen: 'cons', label: 'Cons', icon: ThumbsDown },
  { screen: 'community', label: 'Community', icon: Users },
  { screen: 'deals', label: 'Deals', icon: Tag },
  { screen: 'trust', label: 'Trust', icon: ShieldCheck },
  { screen: 'qa', label: 'Q&A', icon: MessageCircleQuestion },
  { screen: 'alternatives', label: 'Alternatives', icon: Repeat2 },
];

export function Dashboard({
  v,
  mode,
  error,
  coverage = [],
  sources = [],
  grounded = false,
  onBack,
  onNav,
}: {
  v: Verdict;
  mode?: 'live' | 'demo' | 'cached' | null;
  error?: string | null;
  coverage?: Coverage[];
  sources?: Citation[];
  grounded?: boolean;
  onBack?: () => void;
  onNav?: (s: Screen) => void;
}) {
  const meta = VERDICT_META[v.decision];
  return (
    <Panel>
      <AppBar
        title={v.product}
        subtitle={v.category}
        onBack={onBack}
        right={
          <Pill tone={grounded ? 'primary' : 'neutral'}>
            {grounded ? `${v.reviewsAnalyzed.toLocaleString()} sources` : 'AI estimate'}
          </Pill>
        }
      />
      <div className="flex flex-col gap-4 p-4">
        {(mode === 'demo' || error) && (
          <button
            onClick={() => onNav?.('settings')}
            className="rounded-xl border border-consider/30 bg-consider-soft px-3.5 py-2.5 text-left text-[12px] font-medium text-consider"
          >
            {error
              ? `Couldn’t fetch live results (${error}). Showing a sample — tap to check your key in Settings.`
              : 'Demo verdict — add your OpenAI key in Settings for a live, grounded analysis.'}
          </button>
        )}
        {/* verdict hero */}
        <Card className={`relative overflow-hidden ${meta.soft} border-0`}>
          <div className="flex items-center gap-4">
            <Ring value={v.confidence} size={104} stroke={9} color={RING_COLOR[v.decision]}>
              <div>
                <p className="text-2xl font-bold text-ink">
                  <CountUp to={Math.round(v.confidence * 100)} />
                </p>
                <p className="-mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">confidence</p>
              </div>
            </Ring>
            <div className="flex-1">
              <Eyebrow>AI Verdict</Eyebrow>
              <p className={`text-3xl font-bold ${meta.text}`}>{meta.label}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink/80">{v.oneLiner}</p>
            </div>
          </div>
        </Card>

        {/* overview */}
        <Card>
          <Eyebrow>Overview</Eyebrow>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/85">{v.overview}</p>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
            <Tag size={13} /> {v.marketPosition}
          </div>
        </Card>

        {/* category-tuned key facts — the fields that actually matter for THIS kind of product */}
        {v.keyFacts && v.keyFacts.length > 0 && (
          <Card>
            <Eyebrow>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks size={13} /> Key facts
              </span>
            </Eyebrow>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {v.keyFacts.map((f) => {
                const tone =
                  f.sentiment === 'positive'
                    ? 'text-buy'
                    : f.sentiment === 'negative'
                      ? 'text-skip'
                      : 'text-ink';
                return (
                  <div key={f.label} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
                    <dt className="text-[12px] text-muted">{f.label}</dt>
                    <dd className={`text-right text-[13px] font-semibold ${tone}`}>{f.value}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        )}

        {/* sources & grounding — transparency on where the verdict came from */}
        {mode !== 'demo' && (
          <SourcesCard
            coverage={coverage}
            sources={sources}
            grounded={grounded}
            onOpenSettings={() => onNav?.('settings')}
          />
        )}

        {/* quick pros / cons */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-buy/20 bg-buy-soft/50" pad>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-buy">
              <ThumbsUp size={13} /> Top pro
            </p>
            <p className="mt-1.5 text-[13px] font-medium text-ink">{v.pros[0]?.label}</p>
          </Card>
          <Card className="border-skip/20 bg-skip-soft/50" pad>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-skip">
              <ThumbsDown size={13} /> Top con
            </p>
            <p className="mt-1.5 text-[13px] font-medium text-ink">{v.cons[0]?.label}</p>
          </Card>
        </div>

        {/* explore tiles */}
        <div className="flex flex-col gap-1">
          <Eyebrow>Explore the evidence</Eyebrow>
          <div className="mt-1 overflow-hidden rounded-2xl border border-line">
            {TILES.map((t, i) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.screen}
                  onClick={() => onNav?.(t.screen)}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-surface ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-primary">
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink">{t.label}</span>
                  <ChevronRight size={16} className="text-faint" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
