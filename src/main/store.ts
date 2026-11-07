import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Preset, Settings, Job } from '../shared/types';
import { defaultOutputDir, userDataFile } from './paths';

const DEFAULT_TEMPLATE = '%(title)s [%(id)s].%(ext)s';

export const DEFAULT_SETTINGS: Settings = {
  ytdlpPath: null,
  ffmpegPath: null,
  outputDir: '',
  template: DEFAULT_TEMPLATE,
  maxConcurrent: 3,
  theme: 'dark',
  autoUpdateCheck: true,
  speedLimitEnabled: false,
  speedLimitKbps: 0,
  notifyOnComplete: true,
  openFolderOnComplete: false,
  hardwareAcceleration: true,
};

function readJson<T>(file: string, fallback: T): T {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    if (Array.isArray(parsed) || Array.isArray(fallback)) return parsed as T;
    return { ...(fallback as object), ...(parsed as object) } as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
}

class Store {
  private settingsFile = userDataFile('settings.json');
  private presetsFile = userDataFile('presets.json');
  private queueFile = userDataFile('queue.json');

  private _settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<Settings>>(this.settingsFile, {}),
  };

  constructor() {
    if (!this._settings.outputDir) {
      this._settings.outputDir = defaultOutputDir();
    }
  }

  get settings(): Settings {
    return this._settings;
  }

  updateSettings(patch: Partial<Settings>): Settings {
    this._settings = { ...this._settings, ...patch };
    writeJson(this.settingsFile, this._settings);
    return this._settings;
  }

  get presets(): Preset[] {
    return readJson<Preset[]>(this.presetsFile, []);
  }

  savePreset(preset: Omit<Preset, 'createdAt'>): Preset[] {
    const existing = this.presets.filter((p) => p.id !== preset.id);
    const next = [{ ...preset, createdAt: Date.now() }, ...existing];
    writeJson(this.presetsFile, next);
    return next;
  }

  removePreset(id: string): Preset[] {
    const next = this.presets.filter((p) => p.id !== id);
    writeJson(this.presetsFile, next);
    return next;
  }

  get queue(): Job[] {
    return readJson<Job[]>(this.queueFile, []);
  }

  saveQueue(jobs: Job[]): void {
    writeJson(this.queueFile, jobs);
  }
}

let instance: Store | null = null;
export function store(): Store {
  if (!instance) instance = new Store();
  return instance;
}
