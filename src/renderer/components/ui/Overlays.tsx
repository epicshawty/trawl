import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tip({
  label,
  children,
  side = 'top',
  delay = 250,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}) {
  if (!label) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-100 max-w-72 rounded-lg border border-line-strong bg-panel-2/98 px-2.5 py-1.5 text-[11.5px] leading-snug text-fg-soft',
            'shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl',
            'data-[state=delayed-open]:animate-fade',
          )}
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px] data-[state=open]:animate-fade" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]',
            'focus:outline-none',
            'data-[state=open]:animate-rise',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-[14px] font-semibold tracking-[-0.01em] text-fg">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-[12px] text-fg-dim">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close className="mt-0.5 grid size-7 place-items-center rounded-lg text-fg-dim transition-colors hover:bg-white/8 hover:text-fg">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="max-h-[min(74vh,680px)] overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
