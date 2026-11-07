import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import type { DownloadRequest, Job, JobEvent, JobLogLine, Settings } from '../shared/types';
import { buildDownloadArgs, cleanError, PROGRESS_PREFIX, runDownload } from './ytdlp';
import type { ProgressPayload } from './ytdlp';
import { killTree } from './ytdlp';
import { store } from './store';

const MAX_LOG_LINES = 600;
const PROGRESS_EMIT_MS = 120;

interface Runtime {
  kill: () => void;
  intent: 'pause' | 'cancel' | null;
  lastEmit: number;
  pendingEmit: NodeJS.Timeout | null;
  /** yt-dlp downloads video and audio as separate streams; track them apart. */
  streamFile: string | null;
  streamIndex: number;
}

export class QueueManager {
  private jobs = new Map<string, Job>();
  private runtimes = new Map<string, Runtime>();
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly send: (event: JobEvent) => void,
    private readonly getBinary: () => string | null,
    private readonly getSettings: () => Settings,
    private readonly onComplete: (job: Job) => void,
  ) {}

  load(): void {
    for (const job of store().queue) {
      const restored: Job = {
        ...job,
        state: job.state === 'downloading' || job.state === 'probing' ? 'paused' : job.state,
        progress: job.state === 'done' ? job.progress : { ...job.progress, speed: null, eta: null },
      };
      this.jobs.set(restored.id, restored);
    }
  }

  list(): Job[] {
    return [...this.jobs.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  add(req: DownloadRequest): Job {
    const settings = this.getSettings();
    const { args, command } = buildDownloadArgs(req, settings);
    const job: Job = {
      id: randomUUID(),
      url: req.url,
      title: req.title?.trim() || req.url,
      thumbnail: req.thumbnail ?? null,
      uploader: req.uploader ?? null,
      duration: req.duration ?? null,
      state: 'queued',
      progress: { percent: 0, downloadedBytes: 0, totalBytes: null, speed: null, eta: null },
      args,
      command,
      createdAt: Date.now(),
      logTail: [],
      error: null,
    };
    this.jobs.set(job.id, job);
    this.send({ type: 'added', job });
    this.persist();
    this.schedule();
    return job;
  }

  start(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.state = 'queued';
    job.error = null;
    this.emitUpdate(job);
    this.schedule();
  }

  pause(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    const runtime = this.runtimes.get(id);
    if (runtime) {
      runtime.intent = 'pause';
      runtime.kill();
      return;
    }
    if (job.state === 'queued') {
      job.state = 'paused';
      this.emitUpdate(job);
    }
  }

  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    const runtime = this.runtimes.get(id);
    if (runtime) {
      runtime.intent = 'cancel';
      runtime.kill();
      return;
    }
    job.state = 'cancelled';
    job.progress = { percent: 0, downloadedBytes: 0, totalBytes: null, speed: null, eta: null };
    this.emitUpdate(job);
    this.schedule();
  }

  retry(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.error = null;
    job.logTail = [];
    job.progress = { percent: 0, downloadedBytes: 0, totalBytes: null, speed: null, eta: null };
    job.state = 'queued';
    this.emitUpdate(job);
    this.schedule();
  }

  remove(id: string): void {
    const runtime = this.runtimes.get(id);
    if (runtime) {
      runtime.intent = 'cancel';
      runtime.kill();
    }
    this.jobs.delete(id);
    this.send({ type: 'removed', id });
    this.persist();
  }

  clearFinished(): void {
    for (const job of [...this.jobs.values()]) {
      if (job.state === 'done' || job.state === 'error' || job.state === 'cancelled') {
        this.jobs.delete(job.id);
        this.send({ type: 'removed', id: job.id });
      }
    }
    this.persist();
  }

  clearAll(): void {
    for (const runtime of this.runtimes.values()) {
      runtime.intent = 'cancel';
      runtime.kill();
    }
    this.jobs.clear();
    this.send({ type: 'cleared' });
    this.persist();
  }

  pauseAll(): void {
    for (const job of this.jobs.values()) {
      if (job.state === 'queued' || job.state === 'downloading') this.pause(job.id);
    }
  }

  resumeAll(): void {
    for (const job of this.jobs.values()) {
      if (job.state === 'paused') {
        job.state = 'queued';
        this.emitUpdate(job);
      }
    }
    this.schedule();
  }

  shutdown(): void {
    for (const runtime of this.runtimes.values()) {
      runtime.intent = 'pause';
      runtime.kill();
    }
    try {
      store().saveQueue(this.list());
    } catch {
      /* best effort */
    }
  }

  /** Kick the scheduler (used after load to resume restored work). */
  kick(): void {
    this.schedule();
  }

  private schedule(): void {
    const settings = this.getSettings();
    const binary = this.getBinary();
    const active = [...this.jobs.values()].filter((j) => j.state === 'downloading').length;
    const free = Math.max(0, Math.max(1, settings.maxConcurrent) - active);
    if (free === 0) return;

    const queued = [...this.jobs.values()]
      .filter((j) => j.state === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, free);

    for (const job of queued) {
      if (!binary) {
        job.state = 'error';
        job.error = 'yt-dlp was not found. Set its path in Settings → Binaries.';
        this.emitUpdate(job);
        continue;
      }
      this.runJob(job, binary);
    }
  }

  private runJob(job: Job, binary: string): void {
    job.state = 'downloading';
    job.startedAt = job.startedAt ?? Date.now();
    job.error = null;
    this.emitUpdate(job);

    const runtime: Runtime = {
      kill: () => {},
      intent: null,
      lastEmit: 0,
      pendingEmit: null,
      streamFile: null,
      streamIndex: 0,
    };
    this.runtimes.set(job.id, runtime);

    const handle = runDownload(
      binary,
      job.args,
      (line, stream) => this.handleLine(job, line, stream),
      (kill) => (runtime.kill = kill),
    );

    handle.promise.then(({ code, stderrTail }) => {
      this.runtimes.delete(job.id);
      if (runtime.pendingEmit) clearTimeout(runtime.pendingEmit);
      job.progress.speed = null;
      job.progress.eta = null;

      if (runtime.intent === 'pause') {
        job.state = 'paused';
      } else if (runtime.intent === 'cancel') {
        job.state = 'cancelled';
      } else if (code === 0) {
        job.state = 'done';
        job.progress.percent = 100;
        job.finishedAt = Date.now();
        this.pushLog(job, 'app', 'Download complete.');
      } else {
        job.state = 'error';
        job.error = cleanError(stderrTail) || `yt-dlp exited with code ${code}`;
        job.finishedAt = Date.now();
        this.pushLog(job, 'app', job.error);
      }

      this.emitUpdate(job);
      if (job.state === 'done') this.onComplete(job);
      this.persist();
      this.schedule();
    });
  }

  private handleLine(job: Job, line: string, stream: 'stdout' | 'stderr'): void {
    if (line.startsWith(PROGRESS_PREFIX)) {
      this.applyProgress(job, line.slice(PROGRESS_PREFIX.length));
      return;
    }
    if (line.length > 4000) line = `${line.slice(0, 4000)}…`;

    if (/^\[download\]\s+Destination:/.test(line) || /Destination:/.test(line)) {
      const match = /Destination:\s*(.+)$/.exec(line);
      if (match) {
        const file = match[1].trim();
        job.files = [...new Set([...(job.files ?? []), file])];
        job.destDir = dirname(file);
      }
    }

    if (job.state === 'downloading' && /^\[(Merger|ExtractAudio|VideoConvertor|FixupM3u8|Metadata|EmbedThumbnail|SponsorBlock|SplitChapters|MoveFiles)\]/.test(line)) {
      job.state = 'processing';
      this.emitUpdate(job);
    }

    this.pushLog(job, stream, line);
  }

  private applyProgress(job: Job, json: string): void {
    let payload: ProgressPayload;
    try {
      payload = JSON.parse(json) as ProgressPayload;
    } catch {
      return;
    }

    const total = payload.total_bytes ?? payload.total_bytes_estimate ?? null;
    const downloaded = payload.downloaded_bytes ?? 0;
    const percent =
      typeof payload._percent === 'number'
        ? payload._percent
        : total
          ? Math.min(100, (downloaded / total) * 100)
          : 0;

    const runtime0 = this.runtimes.get(job.id);
    const file = payload.filename ?? null;
    if (runtime0 && file && runtime0.streamFile !== file) {
      // A new stream started (e.g. bestvideo finished, bestaudio is next).
      runtime0.streamFile = file;
      runtime0.streamIndex += 1;
    }

    job.progress = {
      percent: Math.max(0, Math.min(100, percent)),
      downloadedBytes: downloaded,
      totalBytes: total,
      speed: payload.speed ?? null,
      eta: payload.eta ?? null,
      fragmentsDone: payload.fragment_index,
      fragmentsTotal: payload.fragment_count,
      stream: runtime0?.streamIndex ?? 1,
    };
    if (payload.status === 'finished') {
      job.progress.percent = 100;
      job.progress.speed = null;
      job.progress.eta = null;
    }
    if (job.state !== 'downloading') job.state = 'downloading';

    const runtime = this.runtimes.get(job.id);
    if (!runtime) return;
    const now = Date.now();
    if (now - runtime.lastEmit >= PROGRESS_EMIT_MS) {
      runtime.lastEmit = now;
      this.send({ type: 'updated', job });
    } else if (!runtime.pendingEmit) {
      runtime.pendingEmit = setTimeout(() => {
        runtime.pendingEmit = null;
        runtime.lastEmit = Date.now();
        this.send({ type: 'updated', job });
      }, PROGRESS_EMIT_MS);
    }
  }

  private pushLog(job: Job, stream: JobLogLine['stream'], text: string): void {
    const line: JobLogLine = { at: Date.now(), stream, text };
    job.logTail = [...job.logTail, line].slice(-MAX_LOG_LINES);
    this.send({ type: 'log', id: job.id, line });
  }

  private emitUpdate(job: Job): void {
    this.send({ type: 'updated', job: { ...job } });
    this.persist();
  }

  private persist(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        store().saveQueue(this.list());
      } catch {
        /* best effort */
      }
    }, 600);
  }

  revealTarget(id: string): string | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    const file = job.files?.[job.files.length - 1];
    if (file && existsSync(file)) return file;
    if (job.destDir && existsSync(job.destDir)) return job.destDir;
    return null;
  }

  static label(job: Job): string {
    if (job.files?.length) return basename(job.files[job.files.length - 1]);
    return job.title;
  }
}

export { killTree };
