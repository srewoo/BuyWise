import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { REGIONS, getRegion } from '@/lib/regions';

/** Compact country chip with a dropdown — used for the quick switch on Home. */
export function RegionPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const region = getRegion(value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-primary"
        aria-label="Change region"
      >
        <span className="text-sm leading-none">{region.flag}</span>
        {region.code}
        <ChevronDown size={13} className={`text-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-line bg-bg shadow-[var(--shadow-panel)]">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              onClick={() => {
                onChange(r.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface ${
                r.code === value ? 'bg-primary-soft/50' : ''
              }`}
            >
              <span className="text-base leading-none">{r.flag}</span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-ink">{r.name}</p>
                <p className="text-[11px] text-muted">{r.retailers.slice(0, 3).join(' · ')}</p>
              </div>
              {r.code === value && <Check size={15} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
