import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, shell } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { BinaryStatus, DownloadRequest, Job, JobEvent, Preset, Settings } from '../shared/types';
import { QueueManager } from './queue';
import { probe } from './ytdlp';
import { resolveBinary, versionOf } from './paths';
import { applyPortableMode } from './portable';
import { store } from './store';

// Before anything reads app.getPath('userData').
const portableState = applyPortableMode();

const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let queue: QueueManager | null = null;
let binaryCache: BinaryStatus = {
  path: null,
  version: null,
  source: 'missing',
  ffmpegVersion: null,
  ffmpegPath: null,
  platform: process.platform,
};

const send = (event: JobEvent) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('job:event', event);
};

async function refreshBinary(): Promise<BinaryStatus> {
  const settings = store().settings;
  const ytdlp = resolveBinary('yt-dlp', settings.ytdlpPath);
  const ffmpeg = resolveBinary('ffmpeg', settings.ffmpegPath);
  binaryCache = {
    path: ytdlp.path,
    version: await versionOf(ytdlp.path),
    source: ytdlp.source,
    ffmpegPath: ffmpeg.path,
    ffmpegVersion: await versionOf(ffmpeg.path, ['-version']),
    platform: process.platform,
  };
  return binaryCache;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#08080b',
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const notifyMaximize = () => mainWindow?.webContents.send('window:maximized', mainWindow.isMaximized());
  mainWindow.on('maximize', notifyMaximize);
  mainWindow.on('unmaximize', notifyMaximize);

  // Never let the app navigate away or spawn windows for remote content.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devServer = process.env.TRAWL_DEV_SERVER;
    if (devServer && url.startsWith(devServer)) return;
    event.preventDefault();
  });

  if (process.env.TRAWL_CAPTURE) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const demoUrl = process.env.TRAWL_DEMO_URL;
        const demoView = process.env.TRAWL_DEMO_VIEW;
        if (demoUrl) {
          await mainWindow?.webContents.executeJavaScript(`(async () => {
            const input = document.querySelector('input[placeholder*="Paste"]');
            if (!input) return 'no input';
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(input, ${JSON.stringify(demoUrl)});
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 250));
            const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Analyze'));
            button?.click();
            return button ? 'clicked' : 'no button';
          })()`);
          await new Promise((r) => setTimeout(r, Number(process.env.TRAWL_DEMO_WAIT ?? 6000)));
        }
        if (process.env.TRAWL_DUMP_DOM) {
          const dump = await mainWindow?.webContents.executeJavaScript(`(() => ({
            buttons: document.querySelectorAll('button').length,
            text: document.body.innerText.slice(0, 120),
            labels: [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim()).slice(0, 14),
          }))()`);
          console.log('[trawl:demo] dom ->', JSON.stringify(dump));
        }
        const demoClick = process.env.TRAWL_DEMO_CLICK;
        if (demoClick) {
          const clickLog = await mainWindow?.webContents.executeJavaScript(`(async () => {
            const labels = ${JSON.stringify((process.env.TRAWL_DEMO_CLICK ?? '').split('|').filter(Boolean))};
            const log = [];
            for (const label of labels) {
              const needle = label.toLowerCase();
              const button = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().toLowerCase().includes(needle));
              button?.click();
              log.push(label + ':' + Boolean(button));
              await new Promise((r) => setTimeout(r, 500));
            }
            return log.join(',');
          })()`);
          console.log('[trawl:demo] click ->', clickLog);
          await new Promise((r) => setTimeout(r, Number(process.env.TRAWL_CLICK_WAIT ?? 4000)));
        }
        if (demoView) {
          await mainWindow?.webContents.executeJavaScript(`(() => {
            const label = ${JSON.stringify(demoView)};
            const button = [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes(label));
            button?.click();
            return Boolean(button);
          })()`);
          await new Promise((r) => setTimeout(r, 800));
        }
        if (process.env.TRAWL_DEMO_JS) {
          const result = await mainWindow?.webContents.executeJavaScript(process.env.TRAWL_DEMO_JS);
          console.log('[trawl:demo] js ->', JSON.stringify(result));
          await new Promise((r) => setTimeout(r, 500));
        }
        const image = await mainWindow?.webContents.capturePage();
        if (image) {
          const { writeFileSync } = await import('node:fs');
          writeFileSync(process.env.TRAWL_CAPTURE as string, image.toPNG());
        }
        app.quit();
      }, Number(process.env.TRAWL_CAPTURE_DELAY ?? 2500));
    });
  }

  const devServer = process.env.TRAWL_DEV_SERVER;
  if (devServer) {
    void mainWindow.loadURL(devServer);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadURL(pathToFileURL(join(__dirname, '../renderer/index.html')).toString());
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu(): void {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  );
}

function registerIpc(): void {
  ipcMain.handle('binary:status', () => binaryCache);

  ipcMain.handle('binary:detect', async () => refreshBinary());

  ipcMain.handle('binary:setPath', async (_event, path: string | null) => {
    store().updateSettings({ ytdlpPath: path });
    return refreshBinary();
  });

  ipcMain.handle('binary:update', async () => {
    if (!binaryCache.path) return { ok: false, message: 'yt-dlp was not found.' };
    const { execFile } = await import('node:child_process');
    return new Promise<{ ok: boolean; message: string }>((resolve) => {
      execFile(binaryCache.path as string, ['-U'], { timeout: 120_000, windowsHide: true }, async (error, stdout, stderr) => {
        await refreshBinary();
        const message = `${stdout}${stderr}`.trim().split(/\r?\n/).slice(-3).join('\n');
        resolve({ ok: !error, message: message || (error ? 'Update failed.' : 'Already up to date.') });
      });
    });
  });

  ipcMain.handle('binary:fetch', async () => {
    const { downloadYtdlp } = await import('./fetch-binary');
    const result = await downloadYtdlp();
    if (result.ok) {
      store().updateSettings({ ytdlpPath: result.path ?? null });
      await refreshBinary();
    }
    return { ok: result.ok, message: result.message };
  });

  ipcMain.handle('ytdlp:probe', async (_event, input: { url: string; values?: Record<string, string | boolean> }) => {
    if (!binaryCache.path) throw new Error('yt-dlp was not found. Set its path in Settings → Binaries.');
    return probe({ binary: binaryCache.path, url: input.url, values: input.values });
  });

  ipcMain.handle('queue:list', () => queue?.list() ?? []);
  ipcMain.handle('queue:add', (_event, req: DownloadRequest) => queue?.add(req));
  ipcMain.handle('queue:start', (_event, id: string) => queue?.start(id));
  ipcMain.handle('queue:pause', (_event, id: string) => queue?.pause(id));
  ipcMain.handle('queue:cancel', (_event, id: string) => queue?.cancel(id));
  ipcMain.handle('queue:retry', (_event, id: string) => queue?.retry(id));
  ipcMain.handle('queue:remove', (_event, id: string) => queue?.remove(id));
  ipcMain.handle('queue:clearFinished', () => queue?.clearFinished());
  ipcMain.handle('queue:clearAll', () => queue?.clearAll());
  ipcMain.handle('queue:pauseAll', () => queue?.pauseAll());
  ipcMain.handle('queue:resumeAll', () => queue?.resumeAll());

  ipcMain.handle('settings:get', () => store().settings);
  ipcMain.handle('settings:set', async (_event, patch: Partial<Settings>) => {
    const next = store().updateSettings(patch);
    if ('ytdlpPath' in patch || 'ffmpegPath' in patch) await refreshBinary();
    return next;
  });

  ipcMain.handle('presets:list', () => store().presets);
  ipcMain.handle('presets:save', (_event, preset: Omit<Preset, 'createdAt'>) => store().savePreset(preset));
  ipcMain.handle('presets:remove', (_event, id: string) => store().removePreset(id));

  ipcMain.handle('dialog:pickDirectory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:pickFile', async (_event, kind: 'ytdlp' | 'cookies' | 'ffmpeg') => {
    if (!mainWindow) return null;
    const filters =
      kind === 'ytdlp'
        ? [{ name: 'yt-dlp executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }]
        : kind === 'cookies'
          ? [{ name: 'Cookies', extensions: ['txt'] }]
          : [{ name: 'ffmpeg', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }];
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('system:openPath', async (_event, path: string) => {
    await shell.openPath(path);
  });
  ipcMain.handle('system:revealItem', (_event, path: string) => {
    shell.showItemInFolder(path);
  });
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    if (/^https?:/i.test(url)) await shell.openExternal(url);
  });
  ipcMain.handle('system:platform', () => process.platform);
  ipcMain.handle('system:paths', () => ({
    portable: portableState.portable,
    userData: app.getPath('userData'),
    exe: app.getPath('exe'),
    version: app.getVersion(),
  }));

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggleMaximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('io.github.epicshawty.trawl');
    buildMenu();
    await refreshBinary();

    queue = new QueueManager(
      send,
      () => binaryCache.path,
      () => store().settings,
      (job: Job) => {
        if (store().settings.notifyOnComplete && Notification.isSupported()) {
          new Notification({ title: 'Download complete', body: job.title.slice(0, 120) }).show();
        }
        if (store().settings.openFolderOnComplete) {
          const target = queue?.revealTarget(job.id);
          if (target) shell.showItemInFolder(target);
        }
      },
    );
    queue.load();
    registerIpc();
    // Restored jobs marked "queued" should continue on their own; interrupted
    // ones come back as "paused" and wait for the user.
    setTimeout(() => queue?.kick(), 1500);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  app.on('before-quit', () => {
    queue?.shutdown();
  });
}
