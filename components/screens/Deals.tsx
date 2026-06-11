import { ExternalLink, TrendingDown, Bell, ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Sparkline, Pill, Eyebrow, Button } from '@/components/ui';
import type { DealInfo, DealTruth } from '@/lib/types';

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

const TRUTH_META = {
  real: { icon: ShieldCheck, tone: 'buy', label: 'Genuine deal', cls: 'border-buy/30 bg-buy-soft', icc: 'text-buy' },
  inflated: { icon: ShieldAlert, tone: 'skip', label: 'Fake / inflated', cls: 'border-skip/30 bg-skip-soft', icc: 'text-skip' },
  unverified: { icon: HelpCircle, tone: 'neutral', label: 'Not enough history', cls: 'border-line bg-surface', icc: 'text-muted' },
} as const;

/** The "is this sale actually a deal?" banner — the heart of BuyWise. */
function DealTruthBanner({ truth }: { truth: DealTruth }) {
  const m = TRUTH_META[truth.status];
  const Icon = m.icon;
  return (
    <Card className={m.cls}>
      <div className="flex items-start gap-3">
        <Icon size={22} className={`mt-0.5 shrink-0 ${m.icc}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Pill tone={m.tone}>{m.label}</Pill>
            {truth.status === 'inflated' && truth.claimedDiscountPct != null && (
              <span className="text-[11px] text-muted line-through">claims {truth.claimedDiscountPct}% off</span>
            )}
          </div>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink/85">{truth.message}</p>
        </div>
      </div>
    </Card>
  );
}

export function Deals({
  product,
  deals,
  onBack,
}: {
  product: string;
  deals: DealInfo;
  onBack?: () => void;
}) {
  const hasOffers = deals.offers.length > 0;
  const lowest = hasOffers ? Math.min(...deals.offers.map((o) => o.price)) : 0;

  if (!hasOffers) {
    return (
      <Panel>
        <AppBar title="Deal finder" subtitle={product} onBack={onBack} />
        <Body>
          {deals.dealTruth && <DealTruthBanner truth={deals.dealTruth} />}
          <Card className="bg-surface">
            <p className="text-[13px] leading-relaxed text-ink/80">{deals.advice}</p>
          </Card>
        </Body>
      </Panel>
    );
  }

  return (
    <Panel>
      <AppBar title="Deal finder" subtitle={product} onBack={onBack} />
      <Body>
        {/* deal-truth verdict — the share-worthy "is this sale fake?" moment */}
        {deals.dealTruth && <DealTruthBanner truth={deals.dealTruth} />}

        {/* price history */}
        <Card>
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Best price now</Eyebrow>
              <p className="text-3xl font-bold text-ink">{fmt(lowest, deals.currency)}</p>
            </div>
            <Pill tone="buy">
              <TrendingDown size={12} /> {Math.round(deals.dropProbability * 100)}% drop likely
            </Pill>
          </div>
          <div className="mt-3">
            <Sparkline data={deals.history.map((h) => h.price)} />
            <div className="mt-1 flex justify-between text-[10px] text-faint">
              {deals.history.map((h) => (
                <span key={h.t}>{h.t}</span>
              ))}
            </div>
          </div>
          {deals.lowestEver != null && (
            <p className="mt-2 text-xs text-muted">
              Lowest ever seen: <span className="font-semibold text-ink">{fmt(deals.lowestEver, deals.currency)}</span>
            </p>
          )}
        </Card>

        {/* advice */}
        <Card className="border-primary/20 bg-primary-soft">
          <p className="text-[13px] font-medium text-ink/85">{deals.advice}</p>
        </Card>

        {/* offers */}
        <div className="flex flex-col gap-1">
          <Eyebrow>Compare retailers</Eyebrow>
          <div className="mt-1 flex flex-col gap-2">
            {deals.offers
              .slice()
              .sort((a, b) => a.price - b.price)
              .map((o) => (
                <a
                  key={o.retailer}
                  href={o.url}
                  className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3.5 py-3 hover:border-primary"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{o.retailer}</p>
                    <p className="text-xs text-muted">{o.inStock ? 'In stock' : 'Out of stock'}</p>
                  </div>
                  {o.price === lowest && <Pill tone="buy">Lowest</Pill>}
                  <span className="text-base font-bold text-ink">{fmt(o.price, o.currency)}</span>
                  <ExternalLink size={15} className="text-faint" />
                </a>
              ))}
          </div>
        </div>

        <Button variant="outline" className="w-full">
          <Bell size={16} /> Set a price alert
        </Button>
      </Body>
    </Panel>
  );
}
