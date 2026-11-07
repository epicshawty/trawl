import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, TerminalSquare } from 'lucide-react';
import { buildDownloadArgs } from '@shared/command';
import type { Settings } from '@shared/types';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';
import { SectionLabel } from './ui/Misc';

/**
 * Live preview of the exact yt-dlp invocation the queue will run.
 * Uses the same builder as the main process, so it cannot drift.
 */
export function CommandPreview({ url }: { url: string }) {
  const values = useApp((s) => s.values);
  const settings = useApp((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const command = useMemo(() => {
    if (!settings) return '';
    const { command: built } = buildDownloadArgs(
      {
        url: url || 'URL',
        values,
        destDir: ((values.paths as string) || '').replace(/^home:/, '') || undefined,
        extraArgs: typeof values.__extra === 'string' ? (values.__extra as string) : undefined,
      },
      settings as Settings,
    );
    return built;
  }, [values, settings, url]);

  const copy = async () => {
    await window.trawl.system.copy(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={rootRef} className="mt-3 overflow-hidden rounded-xl border border-line bg-white/[0.015]">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-white/3"
      >
        <TerminalSquare className="size-3.5 text-fg-dim" />
        <SectionLabel className="text-fg-dim">Command preview</SectionLabel>
        <span className="flex-1" />
        <span className="font-mono text-[10.5px] text-fg-dim">{copied ? 'copied' : 'copy'}</span>
        <ChevronDown className={cn('size-3.5 text-fg-dim transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="relative border-t border-line/60 bg-[#060609] px-3.5 py-2.5">
          <code className="block font-mono text-[10.5px] leading-relaxed break-all whitespace-pre-wrap text-fg-soft/85">
            <span className="text-accent-soft/70">yt-dlp </span>
            {command.replace(/^yt-dlp /, '')}
          </code>
          <button
            type="button"
            onClick={copy}
            className="absolute top-2 right-2 grid size-6 place-items-center rounded-md border border-line bg-panel/80 text-fg-dim transition-colors hover:text-fg"
          >
            {copied ? <Check className="size-3 text-lime" /> : <Copy className="size-3" />}
          </button>
        </div>
      ) : null}
    </div>
  );
}
