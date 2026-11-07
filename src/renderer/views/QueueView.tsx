import { useMemo } from 'react';
import {
  ArrowDownToLine,
  CirclePause,
  CircleX,
  FolderOpen,
  Inbox,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { Job } from '@shared/types';
import { useApp } from '@/store';
import { cn, formatBytes, formatDuration, formatEta, formatSpeed, hostOf } from '@/lib/utils';
import { Badge, EmptyState, ProgressBar, Ring, SectionLabel } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Overlays';

const STATE_LABEL: Record<Job['state'], string> = {
  queued: 'Queued',
  probing: 'Reading',
  downloading: 'Downloading',
  processing: 'Processing',
  paused: 'Paused',
  done: 'Complete',
  error: 'Failed',
  cancelled: 'Cancelled',
};

const STATE_TONE: Record<Job['state'], 'neutral' | 'accent' | 'success' | 'error' | 'warn' | 'info'> = {
  queued: 'neutral',
  probing: 'info',
  downloading: 'accent',
  processing: 'info',
  paused: 'warn',
  done: 'success',
  error: 'error',
  cancelled: 'neutral',
};

function describeWhen(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function JobCard({ job }: { job: Job }) {
  const setView = useApp((s) => s.setView);
  const selectJob = useApp((s) => s.selectJob);
  const toast = useApp((s) => s.toast);

  const active = job.state === 'downloading' || job.state === 'processing';
  const finished = job.state === 'done';
  const failed = job.state === 'error';

  const reveal = async () => {
    const target = job.files?.[job.files.length - 1] ?? job.destDir;
    if (!target) {
      toast({ title: 'No file path recorded yet', tone: 'error' });
      return;
    }
    await window.trawl.system.revealItem(target);
  };

  return (
    <div
      className={cn(
        'animate-rise group relative overflow-hidden rounded-xl border bg-gradient-to-b from-white/[0.035] to-white/[0.012] px-3 py-2.5 transition-colors',
        failed ? 'border-rose/25' : active ? 'border-accent/25' : 'border-line',
      )}
    >
      {active ? (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      ) : null}

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {job.thumbnail ? (
            <img src={job.thumbnail} alt="" className="h-9 w-16 rounded-md border border-white/8 object-cover" />
          ) : (
            <div className="grid h-9 w-16 place-items-center rounded-md border border-line bg-ink-raised text-fg-dim">
              <ArrowDownToLine className="size-3.5" />
            </div>
          )}
          {active ? (
            <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-panel ring-2 ring-panel">
              <Ring value={job.progress.percent} size={16} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-medium text-fg">{job.title || job.url}</span>
            <Badge tone={STATE_TONE[job.state]}>{STATE_LABEL[job.state]}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-fg-dim">
            <span className="truncate">{hostOf(job.url) || job.url}</span>
            {job.duration ? <span>· {formatDuration(job.duration)}</span> : null}
            {job.state === 'done' && job.files?.length ? (
              <span className="truncate">· {job.files[job.files.length - 1].split(/[/\\]/).pop()}</span>
            ) : null}
            {job.state === 'done' && job.progress.totalBytes ? (
              <span className="shrink-0">· {formatBytes(job.progress.totalBytes)}</span>
            ) : null}
            {job.state === 'done' && job.finishedAt ? (
              <span className="shrink-0">· {describeWhen(job.finishedAt)}</span>
            ) : null}
            {failed && job.error ? <span className="truncate text-rose/80">· {job.error}</span> : null}
          </div>

          {active || job.state === 'paused' ? (
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar
                value={job.progress.percent}
                indeterminate={job.state === 'processing'}
                className="h-1 flex-1"
              />
              <span className="w-9 shrink-0 text-right font-mono text-[10px] text-fg-soft">
                {job.state === 'processing' ? '···' : `${job.progress.percent.toFixed(0)}%`}
              </span>
              {job.progress.stream && job.progress.stream > 1 ? (
                <span className="shrink-0 rounded border border-line px-1 font-mono text-[9px] text-fg-dim">
                  stream {job.progress.stream}
                </span>
              ) : null}
              <span className="w-[74px] shrink-0 text-right font-mono text-[10px] text-fg-dim">
                {formatSpeed(job.progress.speed)}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] text-fg-dim">
                {job.progress.totalBytes ? formatBytes(job.progress.totalBytes) : '—'}
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] text-fg-dim">
                {job.progress.eta != null ? formatEta(job.progress.eta) : '—'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-35 transition-opacity group-hover:opacity-100">
          {job.state === 'downloading' ? (
            <Tip label="Pause">
              <Button variant="ghost" size="icon" onClick={() => window.trawl.queue.pause(job.id)}>
                <Pause className="size-3.5" />
              </Button>
            </Tip>
          ) : null}
          {job.state === 'paused' || job.state === 'queued' ? (
            <Tip label="Resume">
              <Button variant="ghost" size="icon" onClick={() => window.trawl.queue.start(job.id)}>
                <Play className="size-3.5" />
              </Button>
            </Tip>
          ) : null}
          {failed || job.state === 'cancelled' ? (
            <Tip label="Retry">
              <Button variant="ghost" size="icon" onClick={() => window.trawl.queue.retry(job.id)}>
                <RotateCcw className="size-3.5" />
              </Button>
            </Tip>
          ) : null}
          {active ? (
            <Tip label="Cancel">
              <Button variant="ghost" size="icon" onClick={() => window.trawl.queue.cancel(job.id)}>
                <CircleX className="size-3.5" />
              </Button>
            </Tip>
          ) : null}
          {finished ? (
            <Tip label="Show in folder">
              <Button variant="ghost" size="icon" onClick={reveal}>
                <FolderOpen className="size-3.5" />
              </Button>
            </Tip>
          ) : null}
          <Tip label="Open log">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                selectJob(job.id);
                setView('log');
              }}
            >
              <Inbox className="size-3.5" />
            </Button>
          </Tip>
          <Tip label="Remove">
            <Button variant="ghost" size="icon" onClick={() => window.trawl.queue.remove(job.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </div>
    </div>
  );
}

export function QueueView() {
  const jobs = useApp((s) => s.jobs);
  const setView = useApp((s) => s.setView);

  const active = useMemo(
    () => jobs.filter((j) => ['downloading', 'processing', 'probing'].includes(j.state)),
    [jobs],
  );
  const queued = useMemo(() => jobs.filter((j) => j.state === 'queued' || j.state === 'paused'), [jobs]);
  const finished = useMemo(
    () => jobs.filter((j) => ['done', 'error', 'cancelled'].includes(j.state)).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)),
    [jobs],
  );

  const totalSpeed = active.reduce((sum, job) => sum + (job.progress.speed ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-8 pt-7 pb-3">
        <div className="mx-auto flex w-full max-w-[1010px] items-end justify-between gap-4">
          <div>
            <h1 className="text-[21px] font-semibold tracking-[-0.025em] text-fg">Queue</h1>
            <p className="mt-0.5 text-[12.5px] text-fg-dim">
              {active.length
                ? `${active.length} downloading${totalSpeed > 0 ? ` · ${formatSpeed(totalSpeed)} total` : ''}`
                : queued.length
                  ? `${queued.length} waiting`
                  : 'Nothing in flight.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {active.length ? (
              <Button variant="outline" size="sm" onClick={() => window.trawl.queue.pauseAll()}>
                <Pause className="size-3.5" />
                Pause all
              </Button>
            ) : queued.some((j) => j.state === 'paused') ? (
              <Button variant="outline" size="sm" onClick={() => window.trawl.queue.resumeAll()}>
                <Play className="size-3.5" />
                Resume all
              </Button>
            ) : null}
            {finished.length ? (
              <Button variant="ghost" size="sm" onClick={() => window.trawl.queue.clearFinished()}>
                <Trash2 className="size-3.5" />
                Clear finished
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => setView('download')}>
              <ArrowDownToLine className="size-3.5" />
              New download
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1010px] px-8 py-4">
          {jobs.length === 0 ? (
            <EmptyState
              icon={<CirclePause className="size-6" />}
              title="The queue is empty"
              description="Add a link from the Download tab and it will appear here with live progress, speed and ETA."
              action={
                <Button variant="primary" size="sm" onClick={() => setView('download')} className="mt-1">
                  Add something
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {active.length ? (
                <section>
                  <SectionLabel className="mb-2">Downloading</SectionLabel>
                  <div className="space-y-1.5">
                    {active.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </section>
              ) : null}

              {queued.length ? (
                <section>
                  <SectionLabel className="mb-2">Up next</SectionLabel>
                  <div className="space-y-1.5">
                    {queued.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </section>
              ) : null}

              {finished.length ? (
                <section>
                  <SectionLabel className="mb-2">Finished</SectionLabel>
                  <div className="space-y-1.5">
                    {finished.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </section>
              ) : null}

              {jobs.some((j) => j.state === 'error') ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose/20 bg-rose/6 px-3 py-2.5">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-rose" />
                  <div className="text-[11.5px] leading-relaxed text-rose/85">
                    Failed jobs keep their yt-dlp output — open the log to see exactly what the site said.
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
