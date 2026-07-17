import { useState } from 'react';
import { ExternalLink, TrendingDown, Bell, BellOff, BellRing, ShieldCheck, ShieldAlert, HelpCircle, Tag, Loader2 } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Sparkline, Pill, Eyebrow, Button } from '@/components/ui';
import type { DealInfo, DealTruth } from '@/lib/types';
import type { PriceAlert } from '@/lib/storage';

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

/**
 * Functional price alert. No backend/price feed exists, so the alert fires when BuyWise next
 * OBSERVES a price (a page price on the next analysis, or a manually-logged price) at/below the
 * target — then surfaces here and via a desktop notification.
 */
function AlertControl({
  currency,
  alert,
  onSet,
  onRemove,
}: {
  currency: string;
  alert?: PriceAlert | null;
  onSet: (target: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const amount = parseFloat(target);
  const valid = isFinite(amount) && amount > 0;

  if (alert) {
    const triggered = !!alert.triggeredAt;
    return (
      <Card className={triggered ? 'border-buy/30 bg-buy-soft' : 'border-primary/20 bg-primary-soft'}>
        <div className="flex items-start gap-3">
          <BellRing size={20} className={`mt-0.5 shrink-0 ${triggered ? 'text-buy' : 'text-primary'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Price alert active</p>
              {triggered && <Pill tone="buy">Target hit</Pill>}
            </div>
            <p className="mt-1 text-xs text-muted">
              Notify me at or below <span className="font-semibold text-ink">{fmt(alert.targetPrice, currency)}</span>.
              {triggered && alert.triggeredPrice != null
                ? ` Hit ${fmt(alert.triggeredPrice, currency)}.`
                : alert.lastPrice != null
                  ? ` Last seen ${fmt(alert.lastPrice, currency)}.`
                  : ' No price observed yet — log one or reopen the product page.'}
            </p>
          </div>
          <button
            onClick={onRemove}
            aria-label="Remove price alert"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
          >
            <BellOff size={16} />
          </button>
        </div>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Bell size={16} /> Set a price alert
      </Button>
    );
  }

  return (
    <Card>
      <p className="text-[13px] font-semibold text-ink">Notify me when the price drops to…</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          autoFocus
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && valid && (onSet(amount), setOpen(false))}
          placeholder={`Target price (${currency})`}
          className="flex-1 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary placeholder:text-faint"
        />
        <Button
          onClick={() => {
            if (valid) {
              onSet(amount);
              setOpen(false);
            }
          }}
          disabled={!valid}
        >
          <Bell size={15} /> Set
        </Button>
      </div>
    </Card>
  );
}

/**
 * "Log the price you see" — the channel-independent grounding path. Enter the price on a shop tag,
 * a showroom sticker, or any site BuyWise doesn't auto-read; it feeds the same real price-history +
 * deal-truth engine as an online product page, so in-store purchases get an honest verdict too.
 */
function PriceLogger({
  currency,
  onRecordPrice,
}: {
  currency: string;
  onRecordPrice: (amount: number, listPrice?: number) => Promise<DealInfo>;
}) {
  const [price, setPrice] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const amount = parseFloat(price);
  const list = parseFloat(listPrice);
  const valid = isFinite(amount) && amount > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onRecordPrice(amount, isFinite(list) && list > 0 ? list : undefined);
      setPrice('');
      setListPrice('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Tag size={14} className="text-primary" /> Log the price you see
      </p>
      <p className="mt-1 text-xs text-muted">
        In a store, a showroom, or on a site BuyWise can’t read? Enter the price ({currency}) to check if it’s a
        genuine deal.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Price you see (${currency})`}
          className="rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary placeholder:text-faint"
        />
        <input
          inputMode="decimal"
          value={listPrice}
          onChange={(e) => setListPrice(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Advertised / MRP price (optional)"
          className="rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary placeholder:text-faint"
        />
        <Button className="w-full" onClick={submit} disabled={!valid || busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
          Check this price
        </Button>
      </div>
    </Card>
  );
}

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
  currency,
  alert,
  onRecordPrice,
  onSetAlert,
  onRemoveAlert,
  onBack,
}: {
  product: string;
  deals: DealInfo;
  currency?: string;
  alert?: PriceAlert | null;
  onRecordPrice?: (amount: number, listPrice?: number) => Promise<DealInfo>;
  onSetAlert?: (target: number) => void;
  onRemoveAlert?: () => void;
  onBack?: () => void;
}) {
  // Local state so a manually-logged price updates the view live, without leaving the screen.
  const [d, setD] = useState<DealInfo>(deals);
  const hasOffers = d.offers.length > 0;
  const lowest = hasOffers ? Math.min(...d.offers.map((o) => o.price)) : 0;
  const cur = d.currency || currency || 'USD';

  const alertControl = onSetAlert && onRemoveAlert ? (
    <AlertControl currency={cur} alert={alert} onSet={onSetAlert} onRemove={onRemoveAlert} />
  ) : null;

  const logger = onRecordPrice ? (
    <PriceLogger
      currency={cur}
      onRecordPrice={async (amount, listPrice) => {
        const next = await onRecordPrice(amount, listPrice);
        setD(next);
        return next;
      }}
    />
  ) : null;

  if (!hasOffers) {
    return (
      <Panel>
        <AppBar title="Deal finder" subtitle={product} onBack={onBack} />
        <Body>
          {d.dealTruth && <DealTruthBanner truth={d.dealTruth} />}
          <Card className="bg-surface">
            <p className="text-[13px] leading-relaxed text-ink/80">{d.advice}</p>
          </Card>
          {logger}
          {alertControl}
        </Body>
      </Panel>
    );
  }

  return (
    <Panel>
      <AppBar title="Deal finder" subtitle={product} onBack={onBack} />
      <Body>
        {/* deal-truth verdict — the share-worthy "is this sale fake?" moment */}
        {d.dealTruth && <DealTruthBanner truth={d.dealTruth} />}

        {/* price history */}
        <Card>
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Best price now</Eyebrow>
              <p className="text-3xl font-bold text-ink">{fmt(lowest, cur)}</p>
            </div>
            <Pill tone="buy">
              <TrendingDown size={12} /> {Math.round(d.dropProbability * 100)}% drop likely
            </Pill>
          </div>
          <div className="mt-3">
            <Sparkline data={d.history.map((h) => h.price)} />
            <div className="mt-1 flex justify-between text-[10px] text-faint">
              {d.history.map((h) => (
                <span key={h.t}>{h.t}</span>
              ))}
            </div>
          </div>
          {d.lowestEver != null && (
            <p className="mt-2 text-xs text-muted">
              Lowest ever seen: <span className="font-semibold text-ink">{fmt(d.lowestEver, cur)}</span>
            </p>
          )}
        </Card>

        {/* advice */}
        <Card className="border-primary/20 bg-primary-soft">
          <p className="text-[13px] font-medium text-ink/85">{d.advice}</p>
        </Card>

        {/* log-your-own-price — grounds in-store & non-Amazon purchases */}
        {logger}

        {/* offers */}
        <div className="flex flex-col gap-1">
          <Eyebrow>Compare sellers</Eyebrow>
          <div className="mt-1 flex flex-col gap-2">
            {d.offers
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

        {alertControl}
      </Body>
    </Panel>
  );
}
