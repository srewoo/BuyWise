import { useState } from 'react';
import { ShieldCheck, AlertTriangle, ExternalLink, ChevronDown } from 'lucide-react';
import { Card, SourceIcon, SOURCE_META } from '@/components/ui';
import type { Citation } from '@/lib/types';
import type { Coverage } from '@/lib/advisor/orchestrator';

const REASON: Record<string, string> = {
  missing_credentials: 'needs API key',
  rate_limited: 'rate-limited',
  no_results: 'no results',
  upstream_error: 'unavailable',
  disabled: 'off',
};

/** Transparency panel: which sources were actually fetched + the real citations behind the verdict. */
export function SourcesCard({
  coverage,
  sources,
  grounded,
  onOpenSettings,
}: {
  coverage: Coverage[];
  sources: Citation[];
  grounded: boolean;
  onOpenSettings?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fetchedCount = coverage.filter((c) => c.status === 'ok').reduce((n, c) => n + c.count, 0);

  return (
    <Card className={grounded ? 'border-buy/20' : 'border-consider/30 bg-consider-soft/40'}>
      {/* grounding status */}
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            grounded ? 'bg-buy-soft text-buy' : 'bg-consider-soft text-consider'
          }`}
        >
          {grounded ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink">
            {grounded ? `Grounded in ${fetchedCount} fetched source${fetchedCount === 1 ? '' : 's'}` : 'Based on AI knowledge'}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            {grounded
              ? 'The verdict was built from the live reviews & discussions below.'
              : 'No live sources were fetched, so this leans on the model’s training. Add a free YouTube key or retry for grounded results.'}
          </p>
        </div>
      </div>

      {/* per-source coverage */}
      {coverage.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {coverage.map((c) => (
            <span
              key={c.name}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                c.status === 'ok' ? 'bg-buy-soft text-buy' : 'bg-surface-2 text-muted'
              }`}
            >
              <SourceIcon source={c.source} size={11} />
              {SOURCE_META[c.source].label}
              {c.status === 'ok' ? ` · ${c.count}` : ` · ${REASON[c.reason ?? ''] ?? 'skipped'}`}
            </span>
          ))}
        </div>
      )}

      {!grounded && onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="mt-3 w-full rounded-lg bg-consider py-2 text-[12px] font-semibold text-white"
        >
          Add a free YouTube key in Settings
        </button>
      )}

      {/* citations */}
      {sources.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
            <span className="flex-1 text-[12px] font-semibold text-ink">
              {sources.length} citation{sources.length === 1 ? '' : 's'}
            </span>
            <ChevronDown size={14} className={`text-faint transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {sources.map((c, i) => (
                <li key={i}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-surface"
                  >
                    <SourceIcon source={c.source} size={12} />
                    <span className="flex-1 truncate text-[12px] text-ink/80">{c.title}</span>
                    <ExternalLink size={12} className="shrink-0 text-faint" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
