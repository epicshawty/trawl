import { create } from 'zustand';
import type {
  BinaryStatus,
  Job,
  JobEvent,
  OptionValue,
  Preset,
  ProbeResult,
  Settings,
} from '@shared/types';

export type View = 'download' | 'options' | 'queue' | 'log';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'error';
}

interface ProbeState {
  url: string;
  loading: boolean;
  error: string | null;
  result: ProbeResult | null;
}

const DRAFT_KEY = 'trawl.draft.v1';

function loadDraft(): Record<string, OptionValue> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OptionValue>) : {};
  } catch {
    return {};
  }
}

interface AppState {
  ready: boolean;
  view: View;
  settings: Settings | null;
  binary: BinaryStatus | null;
  jobs: Job[];
  selectedJobId: string | null;
  presets: Preset[];
  values: Record<string, OptionValue>;
  probe: ProbeState;
  toasts: Toast[];
  settingsOpen: boolean;

  init: () => Promise<void>;
  setView: (view: View) => void;
  setSettingsOpen: (open: boolean) => void;
  setValue: (id: string, value: OptionValue | undefined) => void;
  resetValues: () => void;
  applyValues: (values: Record<string, OptionValue>) => void;
  setProbe: (patch: Partial<ProbeState>) => void;
  probeUrl: (url: string) => Promise<void>;
  enqueue: (url: string, meta?: Partial<Job>) => Promise<void>;
  refreshBinary: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  refreshPresets: () => Promise<void>;
  selectJob: (id: string | null) => void;
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  handleJobEvent: (event: JobEvent) => void;
}

const api = () => window.trawl;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  view: 'download',
  settings: null,
  binary: null,
  jobs: [],
  selectedJobId: null,
  presets: [],
  values: loadDraft(),
  probe: { url: '', loading: false, error: null, result: null },
  toasts: [],
  settingsOpen: false,

  init: async () => {
    const [settings, binary, jobs, presets] = await Promise.all([
      api().settings.get(),
      api().binary.status(),
      api().queue.list(),
      api().presets.list(),
    ]);
    set({ settings, binary, jobs, presets, ready: true });
    api().events.onJob((event) => get().handleJobEvent(event));
  },

  setView: (view) => set({ view }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  setValue: (id, value) => {
    const next = { ...get().values };
    if (value === undefined || value === '' || value === null) delete next[id];
    else next[id] = value;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    set({ values: next });
  },

  resetValues: () => {
    localStorage.removeItem(DRAFT_KEY);
    set({ values: {} });
  },

  applyValues: (values) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    set({ values });
  },

  setProbe: (patch) => set({ probe: { ...get().probe, ...patch } }),

  probeUrl: async (url) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    set({ probe: { url: trimmed, loading: true, error: null, result: null } });
    try {
      const result = await api().probe({ url: trimmed, values: get().values });
      set({ probe: { url: trimmed, loading: false, error: null, result } });
    } catch (error) {
      set({
        probe: {
          url: trimmed,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
          result: null,
        },
      });
    }
  },

  enqueue: async (url, meta) => {
    const values = { ...get().values };
    const job = await api().queue.add({
      url,
      values,
      extraArgs: typeof values.__extra === 'string' ? values.__extra : undefined,
      title: meta?.title,
      thumbnail: meta?.thumbnail,
      uploader: meta?.uploader,
      duration: meta?.duration,
    });
    if (job) {
      set({ jobs: [...get().jobs.filter((j) => j.id !== job.id), job] });
      get().toast({ title: 'Added to queue', description: job.title.slice(0, 80), tone: 'success' });
    }
  },

  refreshBinary: async () => set({ binary: await api().binary.detect() }),

  updateSettings: async (patch) => {
    const settings = await api().settings.set(patch);
    const binary = patch.ytdlpPath !== undefined || patch.ffmpegPath !== undefined
      ? await api().binary.status()
      : get().binary;
    set({ settings, binary });
  },

  refreshPresets: async () => set({ presets: await api().presets.list() }),

  selectJob: (selectedJobId) => set({ selectedJobId }),

  toast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => get().dismissToast(id), 4200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  handleJobEvent: (event) => {
    const { jobs } = get();
    switch (event.type) {
      case 'added':
        set({ jobs: [...jobs.filter((j) => j.id !== event.job.id), event.job] });
        break;
      case 'updated':
        set({
          jobs: jobs.some((j) => j.id === event.job.id)
            ? jobs.map((j) => (j.id === event.job.id ? event.job : j))
            : [...jobs, event.job],
        });
        break;
      case 'removed':
        set({ jobs: jobs.filter((j) => j.id !== event.id) });
        break;
      case 'cleared':
        set({ jobs: [] });
        break;
      case 'log':
        set({
          jobs: jobs.map((j) =>
            j.id === event.id
              ? { ...j, logTail: [...j.logTail, event.line].slice(-600) }
              : j,
          ),
        });
        break;
    }
  },
}));
