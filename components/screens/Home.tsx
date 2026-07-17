import { Search, Clock, ScanLine, X, Settings as SettingsIcon } from 'lucide-react';
import { BrandBar } from '@/components/Shell';
import { RegionPicker } from '@/components/RegionPicker';
import { AppFooter } from '@/components/Footer';
import { DEFAULT_REGION } from '@/lib/regions';

export function Home({
  history = ['iPhone 17 Pro', 'Herman Miller Aeron', "Levi's 501"],
  detected = null,
  region = DEFAULT_REGION,
  onRegionChange = () => {},
  onSearch,
  onRemoveHistory,
  onOpenSettings,
}: {
  history?: string[];
  detected?: string | null;
  region?: string;
  onRegionChange?: (code: string) => void;
  onSearch?: (q: string) => void;
  onRemoveHistory?: (q: string) => void;
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
          <p className="mt-1 text-sm text-muted">
            Research anything before you buy — a car, a laptop, shoes, even a cold drink. Online or in-store.
          </p>
        </div>

        {/* search */}
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 focus-within:border-primary">
          <Search size={18} className="text-faint" />
          <input
            autoFocus
            placeholder="e.g. Toyota RAV4, Nike Pegasus 41, or Coca-Cola Zero"
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
            <div
              key={h}
              className="group flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-surface"
            >
              <button onClick={() => onSearch?.(h)} className="flex-1 text-left text-sm text-ink">
                {h}
              </button>
              {onRemoveHistory ? (
                <button
                  onClick={() => onRemoveHistory(h)}
                  aria-label={`Remove ${h} from recent searches`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint opacity-0 transition hover:bg-line hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              ) : (
                <Search size={14} className="text-faint" />
              )}
            </div>
          ))}
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
