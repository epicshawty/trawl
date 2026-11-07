import { forwardRef } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------------------------- Input --------------------------------- */

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'no-drag h-9 w-full rounded-lg border border-line bg-ink-raised px-3 text-[13px] text-fg',
        'placeholder:text-fg-dim/70',
        'transition-[border-color,box-shadow,background] duration-150',
        'hover:border-line-strong focus:border-accent/60 focus:bg-ink focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      spellCheck={false}
      className={cn(
        'no-drag w-full resize-y rounded-lg border border-line bg-ink-raised px-3 py-2 font-mono text-[12px] leading-relaxed text-fg',
        'placeholder:text-fg-dim/70',
        'transition-[border-color,box-shadow] duration-150',
        'hover:border-line-strong focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

/* --------------------------------- Switch --------------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'no-drag relative h-[22px] w-[38px] shrink-0 rounded-full border transition-all duration-200',
        checked
          ? 'border-accent/50 bg-gradient-to-b from-accent-soft to-accent-deep shadow-[0_0_16px_-4px_rgba(139,92,246,0.7)]'
          : 'border-white/12 bg-black/50 hover:bg-black/30',
        disabled && 'opacity-40',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-200',
          'data-[state=unchecked]:bg-white/55',
          'translate-x-[3px] data-[state=checked]:translate-x-[19px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/* --------------------------------- Select --------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Default',
  className,
  disabled,
}: {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root value={value ?? ''} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'no-drag group flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-raised px-3 text-[13px]',
          'transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
          'data-[state=open]:border-accent/60 data-[state=open]:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]',
          'focus:outline-none data-[placeholder]:text-fg-dim',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-3.5 text-fg-dim transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line-strong bg-panel-2/98 p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl',
            'data-[state=open]:animate-fade',
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex h-8 cursor-pointer select-none items-center rounded-lg pr-2 pl-7 text-[12.5px] text-fg-soft outline-none',
                  'data-[highlighted]:bg-white/8 data-[highlighted]:text-fg',
                  'data-[state=checked]:text-accent-soft',
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* -------------------------------- Segmented -------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('no-drag inline-flex rounded-xl border border-line bg-ink-raised p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all duration-200',
              active
                ? 'bg-gradient-to-b from-white/12 to-white/6 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_8px_rgba(0,0,0,0.4)]'
                : 'text-fg-dim hover:text-fg-soft',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Chips --------------------------------- */

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'no-drag h-7.5 rounded-lg border px-2.5 text-[12px] font-medium transition-all duration-150',
        active
          ? 'border-accent/45 bg-accent/15 text-accent-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-line bg-white/3 text-fg-dim hover:border-line-strong hover:text-fg-soft',
        className,
      )}
    >
      {children}
    </button>
  );
}
