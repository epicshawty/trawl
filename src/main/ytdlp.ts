import { spawn } from 'node:child_process';
import type { OptionValue, ProbeResult } from '../shared/types';
import { PROGRESS_PREFIX } from '../shared/command';

export { PROGRESS_PREFIX };
export { buildDownloadArgs, formatCommand, type BuiltCommand } from '../shared/command';

export interface ProgressPayload {
  status?: string;
  downloaded_bytes?: number;
  total_bytes?: number | null;
  total_bytes_estimate?: number | null;
  fragment_index?: number;
  fragment_count?: number;
  speed?: number | null;
  eta?: number | null;
  filename?: string;
  _percent?: number;
}

export interface ProbeOptions {
  binary: string;
  url: string;
  values?: Record<string, OptionValue>;
  signal?: AbortSignal;
}

export async function probe(opts: ProbeOptions): Promise<ProbeResult> {
  const cookieArgs: string[] = [];
  const values = opts.values ?? {};
  if (typeof values['cookies-from-browser'] === 'string' && values['cookies-from-browser']) {
    cookieArgs.push('--cookies-from-browser', values['cookies-from-browser']);
  }
  if (typeof values.cookies === 'string' && values.cookies) {
    cookieArgs.push('--cookies', values.cookies);
  }
  if (typeof values['extractor-args'] === 'string' && values['extractor-args']) {
    cookieArgs.push('--extractor-args', values['extractor-args']);
  }

  const args = [
    '--ignore-config',
    '--dump-single-json',
    '--flat-playlist',
    '--no-warnings',
    '--no-progress',
    '--socket-timeout',
    '15',
    ...cookieArgs,
    '--',
    opts.url,
  ];

  const stdout = await collect(opts.binary, args, opts.signal, 180_000);

  let parsed: ProbeResult;
  try {
    parsed = JSON.parse(stdout) as ProbeResult;
  } catch {
    throw new Error(cleanError(stdout) || 'yt-dlp returned no metadata for this URL.');
  }
  if (!parsed || (!parsed.title && !parsed.entries)) {
    throw new Error('This URL did not resolve to a video or playlist.');
  }
  return parsed;
}

export interface RunHandle {
  promise: Promise<{ code: number | null; stderrTail: string }>;
  kill: () => void;
}

/** Spawn yt-dlp, streaming stdout/stderr lines to the caller. */
export function runDownload(
  binary: string,
  args: string[],
  onLine: (line: string, stream: 'stdout' | 'stderr') => void,
  onSpawn?: (kill: () => void) => void,
): RunHandle {
  const child = spawn(binary, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrTail = '';
  let buffered = '';

  const handle = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    if (stream === 'stderr') {
      stderrTail = `${stderrTail}${text}`.slice(-8000);
    }
    buffered += text;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onLine(line, stream);
  };

  child.stdout.on('data', handle('stdout'));
  child.stderr.on('data', handle('stderr'));

  const kill = () => killTree(child.pid);
  onSpawn?.(kill);

  const promise = new Promise<{ code: number | null; stderrTail: string }>((resolve) => {
    child.on('close', (code) => {
      if (buffered.trim()) onLine(buffered, 'stdout');
      resolve({ code, stderrTail });
    });
    child.on('error', (error) => {
      onLine(String(error.message), 'stderr');
      resolve({ code: -1, stderrTail: String(error.message) });
    });
  });

  return { promise, kill };
}

function collect(binary: string, args: string[], signal: AbortSignal | undefined, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      killTree(child.pid);
      reject(new Error('yt-dlp timed out while reading this URL.'));
    }, timeoutMs);

    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr = `${stderr}${d.toString('utf8')}`.slice(-8000)));

    const abort = () => {
      killTree(child.pid);
      cleanup();
      reject(new Error('Cancelled.'));
    };
    signal?.addEventListener('abort', abort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    };

    child.on('error', (error) => {
      cleanup();
      reject(error);
    });
    child.on('close', (code) => {
      cleanup();
      if (code === 0 && stdout.trim()) return resolve(stdout);
      reject(new Error(cleanError(stderr) || cleanError(stdout) || `yt-dlp exited with code ${code}`));
    });
  });
}

export function killTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/** Pick the most useful human-readable line out of yt-dlp's stderr noise. */
export function cleanError(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.replace(/^ERROR:\s*/i, '').trim())
    .filter(Boolean)
    .filter((l) => !/^\[.*\]\s/.test(l) || /^\[[a-z]+\].*error/i.test(l));
  const errorLine = lines.reverse().find((l) => /error|unavailable|private|unsupported|failed/i.test(l));
  return (errorLine ?? lines[0] ?? '').slice(0, 400);
}
