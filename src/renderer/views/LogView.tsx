import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Eraser, Terminal } from 'lucide-react';
import { useApp } from '@/store';
import { cn, formatDuration, hostOf } from '@/lib/utils';
import { Badge, EmptyState } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Overlays';

export function LogView() {
  const jobs = useApp((s) => s.jobs);
  const selectedJobId = useApp((s) => s.selectedJobId);
  const selectJob = useApp((s) => s.selectJob);
  const setView = useApp((s) => s.setView);
  const [copied, setCopied] = useState(false);
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(
    () => [...jobs].sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt)),
    [jobs],
  );

  const job = ordered.find((j) => j.id === selectedJobId) ?? ordered[0] ?? null;

  useEffect(() => {
    if (!follow || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [job?.logTail.length, follow, job?.id]);

  if (!job) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <EmptyState
          icon={<Terminal className="size-6" />}
          title="No log to show yet"
          description="Start a download and every line yt-dlp prints lands here, with the exact command that produced it."
          action={
            <Button variant="primary" size="sm" onClick={() => setView('download')} className="mt-1">
              Add a link
            </Button>
          }
        />
      </div>
    );
  }

  const copy = async () => {
    await window.trawl.system.copy(job.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex h-full flex-col">
      <Header />

      <div className="mx-auto flex min-h-0 w-full max-w-[1010px] flex-1 px-8 pb-2">
        <div className="w-[236px] shrink-0 overflow-y-auto border-r border-line py-2 pr-2">
          {ordered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectJob(item.id)}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                item.id === job.id ? 'bg-white/7' : 'hover:bg-white/4',
              )}
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  item.state === 'done'
                    ? 'bg-lime'
                    : item.state === 'error'
                      ? 'bg-rose'
                      : item.state === 'downloading'
                        ? 'animate-pulse bg-accent'
                        : 'bg-fg-dim/50',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] text-fg-soft">{item.title}</span>
                <span className="block truncate text-[10px] text-fg-dim">
                  {hostOf(item.url)} · {item.logTail.length} lines
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col pl-2">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2">
            <Badge
              tone={job.state === 'done' ? 'success' : job.state === 'error' ? 'error' : 'accent'}
            >
              {job.state}
            </Badge>
            <span className="truncate text-[11.5px] text-fg-soft">{job.title}</span>
            <span className="flex-1" />
            <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-fg-dim">
              <input
                type="checkbox"
                checked={follow}
                onChange={(event) => setFollow(event.target.checked)}
                className="accent-accent"
              />
              Follow
            </label>
            <Tip label="Copy the exact yt-dlp command">
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Command'}
              </Button>
            </Tip>
          </div>

          <div className="border-b border-line bg-ink-raised/60 px-4 py-2">
            <code className="line-clamp-2 block font-mono text-[10.5px] leading-relaxed break-all text-accent-soft/75">
              {job.command}
            </code>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#060609] px-4 py-2 font-mono text-[11px] leading-[1.65]">
            {job.logTail.length === 0 ? (
              <div className="py-6 text-center text-fg-dim">Waiting for output…</div>
            ) : (
              job.logTail.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    'whitespace-pre-wrap break-all',
                    line.stream === 'stderr'
                      ? 'text-rose/85'
                      : line.stream === 'app'
                        ? 'text-cyan/90'
                        : /^\[download\]/.test(line.text)
                          ? 'text-fg-dim'
                          : 'text-fg-soft/85',
                  )}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-line px-4 py-1.5">
            <span className="text-[10.5px] text-fg-dim">
              {job.logTail.length} lines
              {job.finishedAt && job.startedAt
                ? ` · finished in ${formatDuration((job.finishedAt - job.startedAt) / 1000)}`
                : ''}
            </span>
            <span className="flex-1" />
            {job.files?.length ? (
              <Button variant="ghost" size="sm" onClick={() => window.trawl.system.revealItem(job.files![job.files!.length - 1])}>
                <Download className="size-3.5" />
                Show file
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => window.trawl.queue.remove(job.id)}>
              <Eraser className="size-3.5" />
              Remove job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const binary = useApp((s) => s.binary);
  return (
    <div className="shrink-0 border-b border-line px-8 pt-7 pb-3">
      <div className="mx-auto flex w-full max-w-[1010px] items-end justify-between">
        <div>
          <h1 className="text-[21px] font-semibold tracking-[-0.025em] text-fg">Log</h1>
          <p className="mt-0.5 text-[12.5px] text-fg-dim">
            Raw yt-dlp output, unobstructed — the fastest way to debug a stubborn site.
          </p>
        </div>
        {binary?.version ? (
          <span className="font-mono text-[10.5px] text-fg-dim">yt-dlp {binary.version}</span>
        ) : null}
      </div>
    </div>
  );
}
