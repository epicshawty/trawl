import { ArrowDownToLine, ListOrdered, SlidersHorizontal, Terminal, Settings2, CircleDot } from 'lucide-react';
import { useApp, type View } from '@/store';
import { cn } from '@/lib/utils';
import { Tip } from './ui/Overlays';
import { Kbd } from './ui/Misc';

const NAV: { id: View; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'download', label: 'Download', icon: <ArrowDownToLine className="size-4" />, hint: '1' },
  { id: 'options', label: 'Options', icon: <SlidersHorizontal className="size-4" />, hint: '2' },
  { id: 'queue', label: 'Queue', icon: <ListOrdered className="size-4" />, hint: '3' },
  { id: 'log', label: 'Log', icon: <Terminal className="size-4" />, hint: '4' },
];

export function Sidebar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const jobs = useApp((s) => s.jobs);
  const binary = useApp((s) => s.binary);
  const openSettings = useApp((s) => s.setSettingsOpen);

  const active = jobs.filter((j) => j.state === 'downloading' || j.state === 'processing' || j.state === 'queued').length;
  const failed = jobs.filter((j) => j.state === 'error').length;
  const healthy = Boolean(binary?.path && binary?.version);

  return (
    <aside className="flex w-[214px] shrink-0 flex-col border-r border-line/70 bg-gradient-to-b from-white/[0.025] to-transparent">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-all duration-150',
                isActive ? 'bg-white/7 text-fg' : 'text-fg-dim hover:bg-white/4 hover:text-fg-soft',
              )}
            >
              <span
                className={cn(
                  'absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gradient-to-b from-accent-soft to-cyan transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className={cn('transition-colors', isActive ? 'text-accent-soft' : 'text-fg-dim group-hover:text-fg-soft')}>
                {item.icon}
              </span>
              {item.label}
              <span className="flex-1" />
              {item.id === 'queue' && active > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-md bg-accent/20 px-1 text-[10.5px] font-semibold text-accent-soft">
                  {active}
                </span>
              ) : null}
              {item.id === 'queue' && failed > 0 && active === 0 ? (
                <span className="size-1.5 rounded-full bg-rose shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
              ) : null}
              <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <Kbd>{item.hint}</Kbd>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-line/70 p-3">
        <Tip
          side="top"
          label={
            healthy ? (
              <div className="space-y-1">
                <div className="font-medium text-fg">yt-dlp {binary?.version}</div>
                <div className="font-mono text-[10.5px] break-all text-fg-dim">{binary?.path}</div>
                <div className="text-[10.5px] text-fg-dim">Binary source: {binary?.source}</div>
              </div>
            ) : (
              'yt-dlp was not found. Open Settings to point Trawl at it.'
            )
          }
        >
          <button
            type="button"
            onClick={() => openSettings(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-line bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-white/6"
          >
            <CircleDot className={cn('size-3.5 shrink-0', healthy ? 'text-lime' : 'text-rose')} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-medium text-fg-soft">
                {healthy ? `yt-dlp ${binary?.version}` : 'yt-dlp missing'}
              </div>
              <div className="truncate text-[10px] text-fg-dim">
                {healthy ? `ffmpeg ${binary?.ffmpegVersion ? 'ready' : 'missing'}` : 'Click to configure'}
              </div>
            </div>
          </button>
        </Tip>

        <button
          type="button"
          onClick={() => openSettings(true)}
          className="mt-1 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] text-fg-dim transition-colors hover:bg-white/5 hover:text-fg-soft"
        >
          <Settings2 className="size-4" />
          Settings
          <span className="flex-1" />
          <Kbd>⌘,</Kbd>
        </button>
      </div>
    </aside>
  );
}
