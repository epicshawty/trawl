import { useEffect, useState } from 'react';
import {
  Check,
  Cpu,
  FolderOpen,
  GitBranch,
  Download,
  RefreshCw,
  Scale,
  Terminal,
  Zap,
} from 'lucide-react';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';
import { Dialog, Tip } from './ui/Overlays';
import { Button } from './ui/Button';
import { Input, Switch } from './ui/Controls';
import { Badge, SectionLabel } from './ui/Misc';
import { YTDLP_VERSION } from '@shared/options';

function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 py-2', className)}>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-fg-soft">{label}</div>
        {hint ? <div className="mt-0.5 text-[10.5px] leading-relaxed text-fg-dim">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsDialog() {
  const open = useApp((s) => s.settingsOpen);
  const setOpen = useApp((s) => s.setSettingsOpen);
  const settings = useApp((s) => s.settings);
  const binary = useApp((s) => s.binary);
  const updateSettings = useApp((s) => s.updateSettings);
  const refreshBinary = useApp((s) => s.refreshBinary);
  const toast = useApp((s) => s.toast);
  const [updating, setUpdating] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) void refreshBinary();
  }, [open, refreshBinary]);

  if (!settings) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Settings"
      description="Binaries, defaults and how Trawl behaves when a download lands."
      width="max-w-2xl"
      footer={
        <Button variant="primary" onClick={() => setOpen(false)}>
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        <section>
          <div className="mb-1 flex items-center gap-2">
            <Terminal className="size-3.5 text-fg-dim" />
            <SectionLabel>Binaries</SectionLabel>
            <span className="flex-1" />
            {binary?.path ? (
              <Badge tone="success">
                <Check className="size-2.5" /> yt-dlp {binary.version}
              </Badge>
            ) : (
              <Badge tone="error">not found</Badge>
            )}
            {binary?.ffmpegPath ? <Badge tone="success">ffmpeg ready</Badge> : <Badge tone="warn">no ffmpeg</Badge>}
          </div>

          <div className="rounded-xl border border-line bg-white/[0.015] px-3">
            <Row label="yt-dlp executable" hint={binary?.path ?? 'Point Trawl at a yt-dlp binary, or leave empty to use PATH.'}>
              <div className="flex items-center gap-1.5">
                {!binary?.path ? (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={fetching}
                    onClick={async () => {
                      setFetching(true);
                      const result = await window.trawl.binary.fetch();
                      setFetching(false);
                      await refreshBinary();
                      toast({
                        title: result.ok ? 'yt-dlp installed' : 'Install failed',
                        description: result.message.slice(0, 160),
                        tone: result.ok ? 'success' : 'error',
                      });
                    }}
                  >
                    <Download className="size-3.5" />
                    Get yt-dlp
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const picked = await window.trawl.dialog.pickFile('ytdlp');
                    if (picked) await window.trawl.binary.setPath(picked);
                  }}
                >
                  Browse
                </Button>
                <Tip label="Check for a newer yt-dlp">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={updating}
                    onClick={async () => {
                      setUpdating(true);
                      const result = await window.trawl.binary.update();
                      setUpdating(false);
                      toast({
                        title: result.ok ? 'yt-dlp updated' : 'Update failed',
                        description: result.message.slice(0, 160),
                        tone: result.ok ? 'success' : 'error',
                      });
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                    Update
                  </Button>
                </Tip>
              </div>
            </Row>
            <div className="h-px bg-line" />
            <Row label="ffmpeg executable" hint={binary?.ffmpegPath ?? 'Needed for muxing, converting and embedding.'}>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const picked = await window.trawl.dialog.pickFile('ffmpeg');
                  if (picked) await updateSettings({ ffmpegPath: picked });
                }}
              >
                Browse
              </Button>
            </Row>
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center gap-2">
            <FolderOpen className="size-3.5 text-fg-dim" />
            <SectionLabel>Downloads</SectionLabel>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.015] px-3">
            <Row label="Save to" hint={settings.outputDir}>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const picked = await window.trawl.dialog.pickDirectory();
                  if (picked) await updateSettings({ outputDir: picked });
                }}
              >
                Change
              </Button>
            </Row>
            <div className="h-px bg-line" />
            <Row label="Filename template" hint="yt-dlp output template. %(title)s, %(id)s, %(ext)s, %(uploader)s…">
              <Input
                value={settings.template}
                onChange={(event) => void updateSettings({ template: event.target.value })}
                className="w-[300px] font-mono text-[11px]"
                spellCheck={false}
              />
            </Row>
            <div className="h-px bg-line" />
            <Row label="Parallel downloads" hint="How many jobs run at once. yt-dlp itself spawns one process per job.">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => void updateSettings({ maxConcurrent: count })}
                    className={cn(
                      'h-7 w-7 rounded-lg border text-[11.5px] transition-all',
                      settings.maxConcurrent === count
                        ? 'border-accent/45 bg-accent/15 text-accent-soft'
                        : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </Row>
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center gap-2">
            <Zap className="size-3.5 text-fg-dim" />
            <SectionLabel>Behaviour</SectionLabel>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.015] px-3">
            <Row label="Notify when a download finishes">
              <Switch
                checked={settings.notifyOnComplete}
                onCheckedChange={(value) => void updateSettings({ notifyOnComplete: value })}
              />
            </Row>
            <div className="h-px bg-line" />
            <Row label="Reveal finished files automatically">
              <Switch
                checked={settings.openFolderOnComplete}
                onCheckedChange={(value) => void updateSettings({ openFolderOnComplete: value })}
              />
            </Row>
            <div className="h-px bg-line" />
            <Row label="Global speed limit" hint="Applied to every download unless a job overrides it.">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={settings.speedLimitKbps}
                  onChange={(event) => void updateSettings({ speedLimitKbps: Number(event.target.value) })}
                  className="h-8 w-[92px] font-mono text-[11px]"
                />
                <span className="text-[11px] text-fg-dim">KB/s</span>
                <Switch
                  checked={settings.speedLimitEnabled}
                  onCheckedChange={(value) => void updateSettings({ speedLimitEnabled: value })}
                />
              </div>
            </Row>
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center gap-2">
            <Cpu className="size-3.5 text-fg-dim" />
            <SectionLabel>About</SectionLabel>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.015] px-3.5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12.5px] font-medium text-fg">Trawl 0.1.0</div>
                <div className="mt-0.5 text-[10.5px] text-fg-dim">
                  Option registry built from yt-dlp {YTDLP_VERSION} · {binary?.platform ?? ''}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.trawl.system.openExternal('https://github.com/epicshawty/trawl')}
                >
                  <GitBranch className="size-3.5" />
                  Source
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.trawl.system.openExternal('https://github.com/epicshawty/trawl/blob/main/LICENSE')}
                >
                  <Scale className="size-3.5" />
                  AGPL-3.0
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
