import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Youtube,
  ShoppingCart,
  Award,
  Tag,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SourceKind } from '@/lib/types';

/** Eased count-up from 0 → `to`, runs once on mount. */
export function CountUp({ to, duration = 1100 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      ref.current = Math.round(to * eased);
      setN(ref.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}

/** Card surface used across every screen. */
export function Card({
  className,
  children,
  pad = true,
}: {
  className?: string;
  children: ReactNode;
  pad?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-bg',
        pad && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'soft';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-4 py-3';
  const variants = {
    primary: 'bg-primary text-white shadow-[var(--shadow-cta)] hover:bg-primary-600',
    outline: 'border border-line bg-bg text-ink hover:bg-surface',
    ghost: 'text-primary hover:bg-primary-soft',
    soft: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
  } as const;
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Pill({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'buy' | 'consider' | 'skip' | 'primary';
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    buy: 'bg-buy-soft text-buy',
    consider: 'bg-consider-soft text-consider',
    skip: 'bg-skip-soft text-skip',
    primary: 'bg-primary-soft text-primary',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-ink">{children}</h3>
      {right}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
    </p>
  );
}

/** A labeled horizontal strength/sentiment bar. */
export function Bar({
  value,
  className,
  trackClassName,
}: {
  value: number; // 0..1
  className?: string;
  trackClassName?: string;
}) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', trackClassName)}>
      <motion.div
        className={cn('h-full rounded-full', className ?? 'bg-primary')}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </div>
  );
}

/** Circular confidence / score ring. */
export function Ring({
  value, // 0..1
  size = 120,
  stroke = 10,
  trackColor = '#E2E8F0',
  color = '#7C3AED',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Tiny SVG sparkline for price history. */
export function Sparkline({
  data,
  width = 320,
  height = 64,
  color = '#7C3AED',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts: [number, number][] = data.map((d, i) => [
    i * step,
    height - ((d - min) / span) * (height - 8) - 4,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Source brand icon + color. */
export const SOURCE_META: Record<
  SourceKind,
  { icon: LucideIcon; color: string; label: string }
> = {
  reddit: { icon: MessageSquare, color: 'var(--color-reddit)', label: 'Reddit' },
  youtube: { icon: Youtube, color: 'var(--color-youtube)', label: 'YouTube' },
  retail: { icon: ShoppingCart, color: 'var(--color-amazon)', label: 'Retail' },
  expert: { icon: Award, color: 'var(--color-expert)', label: 'Experts' },
  pricing: { icon: Tag, color: 'var(--color-primary)', label: 'Pricing' },
};

export function SourceIcon({ source, size = 18 }: { source: SourceKind; size?: number }) {
  const m = SOURCE_META[source];
  const Icon = m.icon;
  return (
    <span
      className="grid place-items-center rounded-lg"
      style={{ width: size + 16, height: size + 16, background: 'color-mix(in srgb, ' + m.color + ' 14%, transparent)' }}
    >
      <Icon size={size} style={{ color: m.color }} />
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? 'fill-star text-star' : 'text-line'}
        />
      ))}
    </span>
  );
}
