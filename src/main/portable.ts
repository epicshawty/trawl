import { accessSync, constants, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';

/**
 * Portable mode.
 *
 * A packaged copy is portable when a file named `portable` sits next to the
 * executable (or TRAWL_PORTABLE=1 is set). Everything Electron would scatter
 * across the OS — settings, queue, presets, the downloaded yt-dlp binary, the
 * Chromium profile — is then redirected into `<app dir>/data`.
 *
 * Must run before anything touches app.getPath('userData').
 */
export function applyPortableMode(): { portable: boolean; dataDir: string | null } {
  const override = process.env.TRAWL_PORTABLE === '1';
  if (!app.isPackaged && !override) return { portable: false, dataDir: null };

  const appDir = dirname(app.getPath('exe'));
  const marker = join(appDir, 'portable');
  const portable = override || existsSync(marker);
  if (!portable) return { portable: false, dataDir: null };

  const dataDir = join(appDir, 'data');
  if (!isWritable(appDir)) return { portable: false, dataDir: null };

  mkdirSync(dataDir, { recursive: true });
  app.setPath('userData', dataDir);
  // Electron ≥ 30 keeps the Chromium profile in its own path; keep it local too.
  try {
    app.setPath('sessionData', dataDir);
  } catch {
    /* older Electron: userData already covers it */
  }
  return { portable: true, dataDir };
}

/** Write probe — a marker in a read-only folder must not brick the app. */
function isWritable(dir: string): boolean {
  const probe = join(dir, '.trawl-write-test');
  try {
    writeFileSync(probe, '');
    accessSync(probe, constants.W_OK);
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export const isPortable = (): boolean => process.env.TRAWL_PORTABLE === '1';
