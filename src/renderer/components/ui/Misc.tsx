import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'accent' | 'success' | 'error' | 'warn' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong bg-white/5 text-fg-soft',
  accent: 'border-accent/30 bg-accent/12 text-accent-soft',
  success: 'border-lime/25 bg-lime/10 text-lime',
  error: 'border-rose/25 bg-rose/10 text-rose',
  warn: 'border-amber/25 bg-amber/10 text-amber',
  info: 'border-cyan/25 bg-cyan/10 text-cyan',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10.5px] font-medium tracking-[0.01em] uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-white/5 px-1 font-sans text-[10.5px] text-fg-dim">
      {children}
    </kbd>
  );
}

export function ProgressBar({
  value,
  indeterminate,
  className,
  glow = true,
}: {
  value: number;
  indeterminate?: boolean;
  className?: string;
  glow?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-accent via-accent-soft to-cyan transition-[width] duration-300 ease-out',
          glow && 'shadow-[0_0_12px_rgba(139,92,246,0.55)]',
          indeterminate && 'w-1/3 animate-pulse',
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}

export function Ring({ value, size = 34 }: { value: number; size?: number }) {
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ringGradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
      <defs>
        <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-[10.5px] font-semibold tracking-[0.12em] text-fg-dim uppercase', className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-white/4 text-fg-dim shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {icon}
      </div>
      <div className="max-w-sm">
        <div className="text-[13.5px] font-medium text-fg">{title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-fg-dim">{description}</div>
      </div>
      {action}
    </div>
  );
}
