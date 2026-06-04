import { Search, Clock, TrendingUp, ScanLine, Settings as SettingsIcon } from 'lucide-react';
import { BrandBar } from '@/components/Shell';
import { Card } from '@/components/ui';
import { RegionPicker } from '@/components/RegionPicker';
import { DEFAULT_REGION } from '@/lib/regions';

const TRENDING = ['iPhone 17 Pro', 'Sony WH-1000XM6', 'Samsung S26 Ultra', 'Dyson V15', 'Steam Deck OLED'];

export function Home({
  history = ['iPhone 17 Pro', 'Dyson V15', 'LG C4 OLED'],
  detected = null,
  region = DEFAULT_REGION,
  onRegionChange = () => {},
  onSearch,
  onOpenSettings,
}: {
  history?: string[];
  detected?: string | null;
  region?: string;
  onRegionChange?: (code: string) => void;
  onSearch?: (q: string) => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-bg">
      <BrandBar
        right={
          <div className="flex items-center gap-1.5">
            <RegionPicker value={region} onChange={onRegionChange} />
            <button
              onClick={onOpenSettings}
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface"
              aria-label="Settings"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-5 p-4">
        <div>
          <h2 className="text-[22px] font-bold leading-tight text-ink">Should you buy it?</h2>
          <p className="mt-1 text-sm text-muted">Search any product for an AI-backed verdict.</p>
        </div>

        {/* search */}
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 focus-within:border-primary">
          <Search size={18} className="text-faint" />
          <input
            autoFocus
            placeholder="e.g. Sony WH-1000XM6"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            onKeyDown={(e) => e.key === 'Enter' && onSearch?.((e.target as HTMLInputElement).value)}
          />
        </div>

        {/* detected on page */}
        {detected && (
          <button
            onClick={() => onSearch?.(detected)}
            className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-3.5 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <ScanLine size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Detected on this page</p>
              <p className="text-sm font-semibold text-ink">{detected}</p>
            </div>
            <span className="text-xs font-semibold text-primary">Analyze →</span>
          </button>
        )}

        {/* recent */}
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Clock size={14} /> Recent
          </p>
          {history.map((h) => (
            <button
              key={h}
              onClick={() => onSearch?.(h)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-surface"
            >
              <span className="text-sm text-ink">{h}</span>
              <Search size={14} className="text-faint" />
            </button>
          ))}
        </div>

        {/* trending */}
        <Card className="bg-surface" pad>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <TrendingUp size={14} /> Trending now
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TRENDING.map((t) => (
              <button
                key={t}
                onClick={() => onSearch?.(t)}
                className="rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
