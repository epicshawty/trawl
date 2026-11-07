import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-accent-soft to-accent-deep text-white shadow-[0_10px_24px_-12px_rgba(139,92,246,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-accent hover:to-accent-deep active:translate-y-px',
  ghost: 'text-fg-soft hover:text-fg hover:bg-white/6',
  outline: 'border border-line-strong text-fg hover:bg-white/6 hover:border-white/25',
  subtle: 'bg-white/6 text-fg hover:bg-white/10',
  danger: 'bg-rose/12 text-rose hover:bg-rose/20 border border-rose/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5 rounded-lg',
  md: 'h-9.5 px-4 text-[13px] gap-2 rounded-xl',
  lg: 'h-11 px-5 text-[13.5px] gap-2 rounded-xl',
  icon: 'size-8 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'subtle', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'no-drag inline-flex select-none items-center justify-center font-medium tracking-[-0.01em] whitespace-nowrap',
        'transition-[background,color,box-shadow,transform,border-color] duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
