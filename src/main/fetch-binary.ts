import { app } from 'electron';
import { chmodSync, createWriteStream, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';

const ASSETS: Record<string, string> = {
  'win32-x64': 'yt-dlp.exe',
  'win32-arm64': 'yt-dlp.exe',
  'darwin-arm64': 'yt-dlp_macos',
  'darwin-x64': 'yt-dlp_macos',
  'linux-x64': 'yt-dlp_linux',
  'linux-arm64': 'yt-dlp_linux_aarch64',
};

const BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';

/**
 * Download the standalone yt-dlp build for this platform into userData/bin.
 * Keeps Trawl usable on machines that have never installed yt-dlp by hand.
 */
export async function downloadYtdlp(): Promise<{ ok: boolean; message: string; path?: string }> {
  const asset = ASSETS[`${process.platform}-${process.arch}`];
  if (!asset) {
    return { ok: false, message: `No standalone yt-dlp build for ${process.platform}/${process.arch}.` };
  }

  const dir = join(app.getPath('userData'), 'bin');
  mkdirSync(dir, { recursive: true });
  const target = join(dir, asset === 'yt-dlp.exe' ? 'yt-dlp.exe' : 'yt-dlp');
  const tmp = `${target}.download`;

  try {
    const response = await fetch(`${BASE}/${asset}`, { redirect: 'follow' });
    if (!response.ok || !response.body) {
      return { ok: false, message: `Download failed (HTTP ${response.status}).` };
    }
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp));
    renameSync(tmp, target);
    if (process.platform !== 'win32') chmodSync(target, 0o755);
    return { ok: true, message: `Saved to ${target}`, path: target };
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      /* nothing to clean up */
    }
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
