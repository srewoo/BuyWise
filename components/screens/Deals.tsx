import { ExternalLink, TrendingDown, Bell } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Sparkline, Pill, Eyebrow, Button } from '@/components/ui';
import type { DealInfo } from '@/lib/types';

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

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
