import { CheckCircle2, Info, X, TriangleAlert } from 'lucide-react';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';

const ICONS = {
  info: <Info className="size-3.5 text-cyan" />,
  success: <CheckCircle2 className="size-3.5 text-lime" />,
  error: <TriangleAlert className="size-3.5 text-rose" />,
};

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-16 z-50 flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'animate-rise pointer-events-auto flex w-[320px] items-start gap-2.5 rounded-xl border bg-panel/96 px-3 py-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl',
            toast.tone === 'error' ? 'border-rose/30' : toast.tone === 'success' ? 'border-lime/25' : 'border-line-strong',
          )}
        >
          <span className="mt-0.5">{ICONS[toast.tone]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-fg">{toast.title}</div>
            {toast.description ? (
              <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-fg-dim">{toast.description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="text-fg-dim transition-colors hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
