import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { SettingsDialog } from './components/SettingsDialog';
import { DownloadView } from './views/DownloadView';
import { OptionsView } from './views/OptionsView';
import { QueueView } from './views/QueueView';
import { LogView } from './views/LogView';
import { useApp } from './store';

const TITLES: Record<string, string> = {
  download: 'Download',
  options: 'Options',
  queue: 'Queue',
  log: 'Log',
};

export default function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const setSettingsOpen = useApp((s) => s.setSettingsOpen);
  const settingsOpen = useApp((s) => s.settingsOpen);
  const binary = useApp((s) => s.binary);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const typing =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (typing) return;

      if (event.key === '1') setView('download');
      if (event.key === '2') setView('options');
      if (event.key === '3') setView('queue');
      if (event.key === '4') setView('log');
      if (event.key === 'Escape' && settingsOpen) setSettingsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setView, setSettingsOpen, settingsOpen]);

  return (
    <div className="aurora flex h-full flex-col bg-ink">
      <TitleBar subtitle={TITLES[view]} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {ready && !binary?.path ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-amber/20 bg-amber/8 px-4 py-1.5">
              <AlertTriangle className="size-3.5 text-amber" />
              <span className="text-[11.5px] text-amber/90">yt-dlp was not found on this system.</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-[11.5px] font-medium text-amber underline decoration-amber/40 underline-offset-2 hover:decoration-amber"
              >
                Install or point Trawl at it
              </button>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {ready ? (
              <>
                {view === 'download' ? <DownloadView /> : null}
                {view === 'options' ? <OptionsView /> : null}
                {view === 'queue' ? <QueueView /> : null}
                {view === 'log' ? <LogView /> : null}
              </>
            ) : (
              <div className="grid h-full place-items-center">
                <div className="flex flex-col items-center gap-3 text-fg-dim">
                  <span className="size-5 animate-spin rounded-full border-2 border-accent/60 border-t-transparent" />
                  <span className="text-[12px]">Starting Trawl…</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <SettingsDialog />
      <Toasts />
    </div>
  );
}
