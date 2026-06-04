import type { ReactNode } from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Top app bar used on result/detail screens. */
export function AppBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-bg/90 px-3 py-3 backdrop-blur">
      {onBack && (
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function BrandBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-4 pt-4">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white shadow-[var(--shadow-cta)]">
        <Sparkles size={17} />
      </span>
      <span className="flex-1 text-[15px] font-bold tracking-tight text-ink">BuyWise</span>
      {right}
    </header>
  );
}

/** Fixed-width side-panel frame (400px) with scrollable body — the device for every screen. */
export function Panel({
  children,
  className,
  scroll = true,
}: {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <div className={cn('flex h-full w-full flex-col bg-bg', className)}>
      <div className={cn('flex-1', scroll ? 'overflow-y-auto' : 'overflow-hidden')}>{children}</div>
    </div>
  );
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4 p-4', className)}>{children}</div>;
}
