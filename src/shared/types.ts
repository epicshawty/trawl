/** Shared types between main, preload and renderer. */

export type OptionValue = string | boolean;

/** A single CLI option as parsed from `yt-dlp --help`. */
export interface OptionSpec {
  id: string;
  group: string;
  short: string | null;
  long: string | null;
  flags: string[];
  metavar: string | null;
  optionalMetavar: boolean;
  desc: string;
}

export interface OptionGroupSpec {
  name: string;
  options: OptionSpec[];
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution?: string | null;
  height?: number | null;
  width?: number | null;
  fps?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  abr?: number | null;
  tbr?: number | null;
  vbr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  format_note?: string | null;
  dynamic_range?: string | null;
  language?: string | null;
  protocol?: string | null;
  audio_channels?: number | null;
  container?: string | null;
}

export interface ProbeResult {
  id: string;
  title: string;
  webpage_url: string;
  original_url?: string;
  extractor_key?: string;
  uploader?: string | null;
  uploader_id?: string | null;
  channel?: string | null;
  channel_url?: string | null;
  duration?: number | null;
  description?: string | null;
  thumbnail?: string | null;
  thumbnails?: { url: string; width?: number; height?: number }[];
  view_count?: number | null;
  like_count?: number | null;
  upload_date?: string | null;
  live_status?: string | null;
  availability?: string | null;
  age_limit?: number | null;
  is_live?: boolean;
  formats?: FormatInfo[];
  entries?: ProbeResult[];
  playlist_count?: number | null;
  chapters?: { title: string; start_time: number; end_time: number }[];
  subtitles?: Record<string, { ext: string; name?: string }[]>;
  automatic_captions?: Record<string, { ext: string; name?: string }[]>;
}

export type JobState =
  | 'queued'
  | 'probing'
  | 'downloading'
  | 'processing'
  | 'paused'
  | 'done'
  | 'error'
  | 'cancelled';

export interface JobProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speed: number | null;
  eta: number | null;
  fragmentsDone?: number;
  fragmentsTotal?: number;
  /** Which stream within this job is downloading (1 = first). */
  stream?: number;
}

export interface JobLogLine {
  at: number;
  stream: 'stdout' | 'stderr' | 'app';
  text: string;
}

export interface Job {
  id: string;
  url: string;
  title: string;
  thumbnail?: string | null;
  uploader?: string | null;
  duration?: number | null;
  state: JobState;
  progress: JobProgress;
  args: string[];
  command: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string | null;
  logTail: JobLogLine[];
  destDir?: string;
  files?: string[];
}

export interface DownloadRequest {
  url: string;
  /** Explicit CLI overrides keyed by option id (long flag without leading dashes). */
  values: Record<string, OptionValue>;
  /** Free-form extra arguments appended verbatim (shell-tokenised). */
  extraArgs?: string;
  /** Cached title/thumbnail so the queue looks right before probing finishes. */
  title?: string;
  thumbnail?: string | null;
  uploader?: string | null;
  duration?: number | null;
  destDir?: string;
}

export interface Settings {
  ytdlpPath: string | null;
  ffmpegPath: string | null;
  outputDir: string;
  template: string;
  maxConcurrent: number;
  speedLimitEnabled: boolean;
  speedLimitKbps: number;
  notifyOnComplete: boolean;
  openFolderOnComplete: boolean;
}

export interface Preset {
  id: string;
  name: string;
  values: Record<string, OptionValue>;
  createdAt: number;
}

export interface BinaryStatus {
  path: string | null;
  version: string | null;
  source: 'custom' | 'bundled' | 'path' | 'missing';
  ffmpegVersion: string | null;
  ffmpegPath: string | null;
  platform: string;
}

export type JobEvent =
  | { type: 'added'; job: Job }
  | { type: 'updated'; job: Job }
  | { type: 'removed'; id: string }
  | { type: 'log'; id: string; line: JobLogLine }
  | { type: 'cleared' };

export interface TrawlApi {
  binary: {
    status(): Promise<BinaryStatus>;
    detect(): Promise<BinaryStatus>;
    setPath(path: string | null): Promise<BinaryStatus>;
    update(): Promise<{ ok: boolean; message: string }>;
    fetch(): Promise<{ ok: boolean; message: string }>;
  };
  probe(input: { url: string; values?: Record<string, OptionValue> }): Promise<ProbeResult>;
  queue: {
    list(): Promise<Job[]>;
    add(req: DownloadRequest): Promise<Job>;
    start(id: string): Promise<void>;
    pause(id: string): Promise<void>;
    cancel(id: string): Promise<void>;
    retry(id: string): Promise<void>;
    remove(id: string): Promise<void>;
    clearFinished(): Promise<void>;
    clearAll(): Promise<void>;
    pauseAll(): Promise<void>;
    resumeAll(): Promise<void>;
  };
  settings: {
    get(): Promise<Settings>;
    set(patch: Partial<Settings>): Promise<Settings>;
  };
  presets: {
    list(): Promise<Preset[]>;
    save(preset: Omit<Preset, 'createdAt'>): Promise<Preset[]>;
    remove(id: string): Promise<Preset[]>;
  };
  dialog: {
    pickDirectory(): Promise<string | null>;
    pickFile(kind: 'ytdlp' | 'cookies' | 'ffmpeg'): Promise<string | null>;
  };
  system: {
    openPath(path: string): Promise<void>;
    openExternal(url: string): Promise<void>;
    revealItem(path: string): Promise<void>;
    copy(text: string): Promise<void>;
    platform(): Promise<string>;
  };
  window: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
    isMaximized(): Promise<boolean>;
    onMaximizeChange(cb: (maximized: boolean) => void): () => void;
  };
  events: {
    onJob(cb: (event: JobEvent) => void): () => void;
  };
}
