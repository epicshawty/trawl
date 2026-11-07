import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Link2, Search, X, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { cn, splitUrls } from '@/lib/utils';

export function UrlBar({
  value,
  onChange,
  onSubmit,
  loading,
  onPaste,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onPaste: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const count = splitUrls(value).length;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v' && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSubmit]);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-2xl border bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-1.5 pl-4 transition-all duration-200',
        focused
          ? 'border-accent/45 shadow-[0_0_0_4px_rgba(139,92,246,0.10),0_18px_50px_-24px_rgba(139,92,246,0.7)]'
          : 'border-line-strong hover:border-white/25',
      )}
    >
      <Link2 className={cn('size-4 shrink-0 transition-colors', focused ? 'text-accent-soft' : 'text-fg-dim')} />

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === 'Escape') onChange('');
        }}
        placeholder="Paste a video, playlist or channel URL…"
        spellCheck={false}
        className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-dim/70"
      />

      {value ? (
        <>
          {count > 1 ? (
            <span className="shrink-0 rounded-md border border-accent/30 bg-accent/12 px-1.5 py-0.5 text-[10.5px] font-medium text-accent-soft">
              {count} links
            </span>
          ) : null}
          <Button variant="ghost" size="icon" onClick={() => onChange('')} aria-label="Clear">
            <X className="size-3.5" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" onClick={onPaste} className="shrink-0 text-fg-dim">
          <ClipboardPaste className="size-3.5" />
          Paste
        </Button>
      )}

      <Button variant="primary" size="md" onClick={onSubmit} disabled={loading} className="shrink-0 px-4">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        {loading ? 'Reading…' : 'Analyze'}
      </Button>
    </div>
  );
}
