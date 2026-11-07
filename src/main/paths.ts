import { app } from 'electron';
import { accessSync, constants } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const isWindows = process.platform === 'win32';
export const exe = (name: string) => (isWindows ? `${name}.exe` : name);

export const userDataFile = (name: string) => join(app.getPath('userData'), name);

export function defaultOutputDir(): string {
  try {
    return app.getPath('videos');
  } catch {
    return app.getPath('home');
  }
}

function usable(candidate: string | null | undefined): candidate is string {
  if (!candidate) return false;
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function searchPath(binary: string): string | null {
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = join(dir, binary);
    if (usable(candidate)) return candidate;
  }
  return null;
}

/** Candidate locations for a bundled helper next to the app binary. */
function bundledCandidates(binary: string): string[] {
  const roots = [
    process.resourcesPath ? join(process.resourcesPath, 'bin') : null,
    app.isPackaged ? join(process.resourcesPath, 'app.asar.unpacked', 'bin') : null,
    // Dev convenience: repo-local tools folder.
    app.isPackaged ? null : resolve(app.getAppPath(), '.tools'),
  ].filter(Boolean) as string[];
  return roots.map((root) => join(root, binary));
}

export function resolveBinary(
  binary: 'yt-dlp' | 'ffmpeg',
  customPath: string | null,
): { path: string | null; source: 'custom' | 'bundled' | 'path' | 'missing' } {
  if (customPath) {
    if (usable(customPath)) return { path: customPath, source: 'custom' };
    const asExe = `${customPath}${isWindows ? '.exe' : ''}`;
    if (usable(asExe)) return { path: asExe, source: 'custom' };
  }

  for (const candidate of bundledCandidates(exe(binary))) {
    if (usable(candidate)) return { path: candidate, source: 'bundled' };
  }

  const fromPath = searchPath(exe(binary));
  if (fromPath) return { path: fromPath, source: 'path' };

  if (customPath) return { path: customPath, source: 'custom' };
  return { path: null, source: 'missing' };
}

export async function versionOf(bin: string | null, args: string[] = ['--version']): Promise<string | null> {
  if (!bin) return null;
  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: 15000, windowsHide: true });
    return stdout.trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}
