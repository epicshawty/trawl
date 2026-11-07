import { contextBridge, ipcRenderer } from 'electron';
import type { DownloadRequest, JobEvent, OptionValue, Preset, Settings, TrawlApi } from '../shared/types';

const api: TrawlApi = {
  binary: {
    status: () => ipcRenderer.invoke('binary:status'),
    detect: () => ipcRenderer.invoke('binary:detect'),
    setPath: (path) => ipcRenderer.invoke('binary:setPath', path),
    update: () => ipcRenderer.invoke('binary:update'),
    fetch: () => ipcRenderer.invoke('binary:fetch'),
  },
  probe: (input: { url: string; values?: Record<string, OptionValue> }) => ipcRenderer.invoke('ytdlp:probe', input),
  queue: {
    list: () => ipcRenderer.invoke('queue:list'),
    add: (req: DownloadRequest) => ipcRenderer.invoke('queue:add', req),
    start: (id) => ipcRenderer.invoke('queue:start', id),
    pause: (id) => ipcRenderer.invoke('queue:pause', id),
    cancel: (id) => ipcRenderer.invoke('queue:cancel', id),
    retry: (id) => ipcRenderer.invoke('queue:retry', id),
    remove: (id) => ipcRenderer.invoke('queue:remove', id),
    clearFinished: () => ipcRenderer.invoke('queue:clearFinished'),
    clearAll: () => ipcRenderer.invoke('queue:clearAll'),
    pauseAll: () => ipcRenderer.invoke('queue:pauseAll'),
    resumeAll: () => ipcRenderer.invoke('queue:resumeAll'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:set', patch),
  },
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    save: (preset: Omit<Preset, 'createdAt'>) => ipcRenderer.invoke('presets:save', preset),
    remove: (id) => ipcRenderer.invoke('presets:remove', id),
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke('dialog:pickDirectory'),
    pickFile: (kind) => ipcRenderer.invoke('dialog:pickFile', kind),
  },
  system: {
    openPath: (path) => ipcRenderer.invoke('system:openPath', path),
    revealItem: (path) => ipcRenderer.invoke('system:revealItem', path),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
    copy: async (text: string) => {
      await navigator.clipboard.writeText(text);
    },
    platform: () => ipcRenderer.invoke('system:platform'),
    paths: () => ipcRenderer.invoke('system:paths'),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb: (maximized: boolean) => void) => {
      const listener = (_event: unknown, maximized: boolean) => cb(maximized);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
  events: {
    onJob: (cb: (event: JobEvent) => void) => {
      const listener = (_event: unknown, payload: JobEvent) => cb(payload);
      ipcRenderer.on('job:event', listener);
      return () => ipcRenderer.removeListener('job:event', listener);
    },
  },
};

contextBridge.exposeInMainWorld('trawl', api);
