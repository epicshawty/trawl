import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AudioLines,
  Check,
  ChevronRight,
  Download,
  FolderOpen,
  Layers,
  Lightbulb,
  Radio,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useApp } from '@/store';
import type { FormatInfo } from '@shared/types';
import { cn, splitUrls } from '@/lib/utils';
import {
  buildVideoFormat,
  HEIGHT_PRESETS,
  isVideoExpression,
  parseVideoFormat,
  summariseTarget,
  type Codec,
  type ComposerMode,
} from '@/lib/format';
import { UrlBar } from '@/components/UrlBar';
import { MediaCard } from '@/components/MediaCard';
import { CommandPreview } from '@/components/CommandPreview';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Controls';
import { Badge, SectionLabel } from '@/components/ui/Misc';
import { Dialog, Tip } from '@/components/ui/Overlays';

const CONTAINERS = ['mp4', 'mkv', 'webm', 'mov'];
const AUDIO_FORMATS = ['mp3', 'm4a', 'opus', 'flac', 'wav', 'best'];
const CODECS: { value: Codec; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'h264', label: 'H.264' },
  { value: 'vp9', label: 'VP9' },
  { value: 'av1', label: 'AV1' },
];

const QUICK_TOGGLES: { id: string; label: string; hint: string; value?: boolean }[] = [
  { id: 'embed-metadata', label: 'Metadata', hint: 'Write title, artist, date into the file' },
  { id: 'embed-thumbnail', label: 'Cover art', hint: 'Embed the thumbnail' },
  { id: 'embed-subs', label: 'Subtitles', hint: 'Embed downloaded subtitles' },
  { id: 'embed-chapters', label: 'Chapters', hint: 'Embed chapter markers' },
  { id: 'split-chapters', label: 'Split chapters', hint: 'One file per chapter' },
];

export function DownloadView() {
  const probe = useApp((s) => s.probe);
  const values = useApp((s) => s.values);
  const setValue = useApp((s) => s.setValue);
  const probeUrl = useApp((s) => s.probeUrl);
  const enqueue = useApp((s) => s.enqueue);
  const settings = useApp((s) => s.settings);
  const presets = useApp((s) => s.presets);
  const applyValues = useApp((s) => s.applyValues);
  const resetValues = useApp((s) => s.resetValues);
  const refreshPresets = useApp((s) => s.refreshPresets);
  const toast = useApp((s) => s.toast);

  const [url, setUrl] = useState('');
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const urls = useMemo(() => splitUrls(url), [url]);
  const isBatch = urls.length > 1;

  const mode: ComposerMode = values['extract-audio']
    ? 'audio'
    : values.format && !isVideoExpression(values.format as string)
      ? 'custom'
      : 'video';

  const target = parseVideoFormat(values.format as string | undefined, values['merge-output-format'] as string | undefined);
  const audioFormat = (values['audio-format'] as string) || 'mp3';
  const destDir = ((values.paths as string) || '').replace(/^home:/, '') || settings?.outputDir || '';
  const template = (values.output as string) || settings?.template || '%(title)s [%(id)s].%(ext)s';
  const overrideCount = Object.keys(values).filter((key) => !key.startsWith('__')).length;
  const effectiveFormat = (values.format as string) || buildVideoFormat(target);

  const applyVideo = useCallback(
    (patch: Partial<{ height: number | null; fps: number | null; codec: Codec; container: string | null }>) => {
      const next = { ...target, ...patch };
      const expr = buildVideoFormat(next);
      setValue('format', expr);
      if (next.container) setValue('merge-output-format', next.container);
      else setValue('merge-output-format', undefined);
    },
    [target, setValue],
  );

  const switchMode = (next: ComposerMode) => {
    if (next === 'audio') {
      setValue('extract-audio', true);
      setValue('format', 'ba/b');
      if (!values['audio-format']) setValue('audio-format', 'mp3');
      return;
    }
    setValue('extract-audio', undefined);
    if (next === 'video') {
      setValue('format', buildVideoFormat(target));
    } else if (isVideoExpression(values.format as string)) {
      setValue('format', 'bv*+ba/b');
    }
  };

  const handleAnalyze = () => {
    if (!urls.length) return;
    if (isBatch) {
      void Promise.all(urls.map((link) => enqueue(link))).then(() =>
        toast({ title: `Queued ${urls.length} links`, tone: 'success' }),
      );
      setUrl('');
      return;
    }
    void probeUrl(urls[0]);
  };

  const handleAdd = async () => {
    const list = urls.length ? urls : probe.result ? [probe.result.webpage_url] : [];
    if (!list.length) {
      toast({ title: 'Paste a link first', tone: 'error' });
      return;
    }
    for (const link of list) {
      await enqueue(link, {
        title: probe.result?.title,
        thumbnail: probe.result?.thumbnail,
        uploader: probe.result?.uploader,
        duration: probe.result?.duration,
      });
    }
    setUrl('');
    useApp.getState().setView('queue');
  };

  const pickFormat = (format: FormatInfo) => {
    const isAudio = !format.vcodec || format.vcodec === 'none';
    setValue('format', isAudio ? `${format.format_id}/bestaudio/best` : `${format.format_id}+bestaudio/best`);
    toast({ title: `Using format ${format.format_id}`, tone: 'info' });
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (splitUrls(text).length === 1) void probeUrl(text.trim());
      }
    } catch {
      toast({ title: 'Clipboard is unavailable', tone: 'error' });
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v' && !url) {
        void pasteFromClipboard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const summary = summariseTarget(mode, target, audioFormat, probe.result);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1010px] px-8 pt-7 pb-6">
          <div className="mb-5">
            <h1 className="text-[21px] font-semibold tracking-[-0.025em] text-fg">Download</h1>
            <p className="mt-0.5 text-[12.5px] text-fg-dim">
              Paste one link — or a batch separated by spaces. Everything yt-dlp can reach, without the flags.
            </p>
          </div>

          <UrlBar
            value={url}
            onChange={setUrl}
            onSubmit={handleAnalyze}
            loading={probe.loading}
            onPaste={pasteFromClipboard}
          />

          {probe.error ? (
            <div className="animate-rise mt-3 flex items-start gap-2.5 rounded-xl border border-rose/25 bg-rose/8 px-3.5 py-2.5">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-rose/20 text-[10px] text-rose">!</span>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-rose">Could not read that link</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed break-words text-rose/80">{probe.error}</div>
              </div>
            </div>
          ) : null}

          {probe.loading ? <ProbeSkeleton /> : null}

          {probe.result && !probe.loading ? (
            <div className="mt-3">
              <MediaCard result={probe.result} onPickFormat={pickFormat} />
            </div>
          ) : null}

          {!probe.result && !probe.loading && !probe.error ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { icon: <Sparkles className="size-4" />, title: '1000+ sites', text: 'YouTube, Vimeo, Twitch, SoundCloud, X and everything else yt-dlp supports.' },
                { icon: <Wand2 className="size-4" />, title: 'Sane defaults', text: 'Best video plus best audio, muxed to MP4. Change it once and it sticks.' },
                { icon: <Layers className="size-4" />, title: 'Every flag', text: 'All 245 CLI options are in the Options tab — nothing is hidden from you.' },
              ].map((card) => (
                <div key={card.title} className="panel px-3.5 py-3">
                  <div className="mb-1.5 text-accent-soft">{card.icon}</div>
                  <div className="text-[12.5px] font-medium text-fg">{card.title}</div>
                  <div className="mt-1 text-[11.5px] leading-relaxed text-fg-dim">{card.text}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-[1.25fr_1fr] items-start gap-3">
            {/* Format panel */}
            <section className="panel flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Format</SectionLabel>
                <div className="flex gap-1 rounded-lg border border-line bg-ink-raised p-0.5">
                  {(['video', 'audio', 'custom'] as ComposerMode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => switchMode(value)}
                      className={cn(
                        'h-6 rounded-md px-2.5 text-[11.5px] font-medium capitalize transition-all',
                        mode === value ? 'bg-white/10 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]' : 'text-fg-dim hover:text-fg-soft',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'video' ? (
                <div className="space-y-3.5">
                  <div>
                    <div className="mb-1.5 text-[11px] text-fg-dim">Resolution ceiling</div>
                    <div className="flex flex-wrap gap-1.5">
                      {HEIGHT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyVideo({ height: preset.value })}
                          className={cn(
                            'h-7 rounded-lg border px-2.5 text-[11.5px] font-medium transition-all',
                            target.height === preset.value
                              ? 'border-accent/45 bg-accent/15 text-accent-soft'
                              : 'border-line bg-white/3 text-fg-dim hover:border-line-strong hover:text-fg-soft',
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1.5 text-[11px] text-fg-dim">Container</div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyVideo({ container: null })}
                          className={cn(
                            'h-7 rounded-lg border px-2 text-[11.5px] transition-all',
                            !target.container
                              ? 'border-accent/45 bg-accent/15 text-accent-soft'
                              : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
                          )}
                        >
                          Auto
                        </button>
                        {CONTAINERS.map((container) => (
                          <button
                            key={container}
                            type="button"
                            onClick={() => applyVideo({ container })}
                            className={cn(
                              'h-7 rounded-lg border px-2 text-[11.5px] transition-all',
                              target.container === container
                                ? 'border-accent/45 bg-accent/15 text-accent-soft'
                                : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
                            )}
                          >
                            {container}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[11px] text-fg-dim">Codec preference</div>
                      <div className="flex gap-1.5">
                        {CODECS.map((codec) => (
                          <button
                            key={codec.value}
                            type="button"
                            onClick={() => applyVideo({ codec: codec.value })}
                            className={cn(
                              'h-7 rounded-lg border px-2 text-[11.5px] transition-all',
                              target.codec === codec.value
                                ? 'border-accent/45 bg-accent/15 text-accent-soft'
                                : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
                            )}
                          >
                            {codec.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-ink-raised/60 px-2.5 py-1.5">
                    <span className="font-mono text-[10.5px] text-fg-dim">-f</span>
                    <code
                      className={cn(
                        'min-w-0 flex-1 truncate font-mono text-[10.5px]',
                        values.format ? 'text-accent-soft/85' : 'text-fg-dim',
                      )}
                    >
                      {effectiveFormat}
                    </code>
                    {values['merge-output-format'] ? (
                      <span className="shrink-0 rounded border border-line bg-white/4 px-1 py-px font-mono text-[9.5px] text-fg-dim">
                        → {values['merge-output-format'] as string}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {mode === 'audio' ? (
                <div className="space-y-3.5">
                  <div>
                    <div className="mb-1.5 text-[11px] text-fg-dim">Target format</div>
                    <div className="flex flex-wrap gap-1.5">
                      {AUDIO_FORMATS.map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => setValue('audio-format', format)}
                          className={cn(
                            'h-7 rounded-lg border px-2.5 font-mono text-[11.5px] transition-all',
                            audioFormat === format
                              ? 'border-accent/45 bg-accent/15 text-accent-soft'
                              : 'border-line bg-white/3 text-fg-dim hover:border-line-strong hover:text-fg-soft',
                          )}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                  {['flac', 'wav', 'best'].includes(audioFormat) ? null : (
                  <div>
                    <div className="mb-1.5 text-[11px] text-fg-dim">Bitrate quality (0 = best VBR, 10 = worst)</div>
                    <div className="flex gap-1.5">
                      {['best', '0', '2', '5', '8'].map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setValue('audio-quality', quality)}
                          className={cn(
                            'h-7 min-w-9 rounded-lg border px-2 text-[11.5px] transition-all',
                            ((values['audio-quality'] as string) || 'best') === quality
                              ? 'border-accent/45 bg-accent/15 text-accent-soft'
                              : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
                          )}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-ink-raised/60 px-2.5 py-1.5">
                    <AudioLines className="size-3 text-fg-dim" />
                    <span className="text-[10.5px] text-fg-dim">Audio is extracted then converted with ffmpeg.</span>
                  </div>
                </div>
              ) : null}

              {mode === 'custom' ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-fg-dim">Raw format expression</div>
                  <Textarea
                    rows={3}
                    value={(values.format as string) ?? ''}
                    onChange={(event) => setValue('format', event.target.value || undefined)}
                    placeholder="bv*[height<=1080]+ba/b"
                  />
                  <div className="text-[10.5px] text-fg-dim">
                    Anything yt-dlp accepts goes here — see{' '}
                    <button
                      type="button"
                      className="text-accent-soft underline-offset-2 hover:underline"
                      onClick={() => window.trawl.system.openExternal('https://github.com/yt-dlp/yt-dlp#format-selection')}
                    >
                      format selection
                    </button>
                    .
                  </div>
                </div>
              ) : null}
            </section>

            {/* Destination + toggles */}
            <div className="flex flex-col gap-3">
              <section className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <SectionLabel>Destination</SectionLabel>
                  <Tip label="Open this folder">
                    <button
                      type="button"
                      onClick={() => destDir && window.trawl.system.openPath(destDir)}
                      className="text-fg-dim transition-colors hover:text-fg-soft"
                    >
                      <FolderOpen className="size-3.5" />
                    </button>
                  </Tip>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const picked = await window.trawl.dialog.pickDirectory();
                    if (picked) setValue('paths', `home:${picked}`);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-ink-raised px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-white/4"
                >
                  <FolderOpen className="size-3.5 shrink-0 text-fg-dim" />
                  <span className="truncate font-mono text-[11px] text-fg-soft">{destDir || 'Choose a folder…'}</span>
                  <ChevronRight className="ml-auto size-3.5 shrink-0 text-fg-dim" />
                </button>

                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-fg-dim">Filename template</span>
                    {values.output ? (
                      <button
                        type="button"
                        onClick={() => setValue('output', undefined)}
                        className="text-[10.5px] text-fg-dim hover:text-fg-soft"
                      >
                        reset
                      </button>
                    ) : null}
                  </div>
                  <input
                    value={template}
                    onChange={(event) => setValue('output', event.target.value || undefined)}
                    spellCheck={false}
                    className="h-8 w-full rounded-lg border border-line bg-ink-raised px-2 font-mono text-[10.5px] text-fg-soft outline-none transition-colors hover:border-line-strong focus:border-accent/50"
                  />
                </div>
              </section>

              <section className="panel p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <SectionLabel>Finishing touches</SectionLabel>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(true)}
                    className="text-[10.5px] text-fg-dim transition-colors hover:text-accent-soft"
                  >
                    more…
                  </button>
                </div>
                <div className="space-y-0.5">
                  {QUICK_TOGGLES.map((toggle) => {
                    const active = Boolean(values[toggle.id]);
                    return (
                      <button
                        key={toggle.id}
                        type="button"
                        onClick={() => setValue(toggle.id, active ? undefined : true)}
                        className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-white/4"
                      >
                        <span
                          className={cn(
                            'grid size-4 shrink-0 place-items-center rounded-[5px] border transition-all',
                            active
                              ? 'border-accent/60 bg-accent/25 text-accent-soft'
                              : 'border-white/22 bg-white/4 text-transparent group-hover:border-white/35',
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span className={cn('text-[12px]', active ? 'text-fg' : 'text-fg-soft')}>{toggle.label}</span>
                        <span className="flex-1" />
                        <span className="text-[10px] text-fg-dim opacity-0 transition-opacity group-hover:opacity-100">
                          {toggle.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <CommandPreview url={urls[0] ?? probe.result?.webpage_url ?? ''} />

          {/* Presets row */}
          <div className="mt-3 flex items-center gap-2">
            <Lightbulb className="size-3.5 shrink-0 text-fg-dim" />
            <span className="shrink-0 text-[11px] text-fg-dim">Presets</span>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {presets.length === 0 ? (
                <span className="text-[11px] text-fg-dim/70">None yet — dial in your settings, then save them.</span>
              ) : (
                presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyValues(preset.values)}
                    className="h-6.5 shrink-0 rounded-md border border-line bg-white/3 px-2 text-[11px] text-fg-dim transition-all hover:border-accent/40 hover:text-accent-soft"
                  >
                    {preset.name}
                  </button>
                ))
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPresetOpen(true)} className="shrink-0 text-fg-dim">
              <Save className="size-3.5" /> Save preset
            </Button>
            {overrideCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={resetValues} className="shrink-0 text-fg-dim">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="shrink-0 border-t border-line bg-ink/70 px-8 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1010px] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent-soft">
              {mode === 'audio' ? <AudioLines className="size-4" /> : <Download className="size-4" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-fg">
                {isBatch ? `${urls.length} links queued for ${summary.title.toLowerCase()}` : summary.title}
              </div>
              <div className="truncate text-[10.5px] text-fg-dim">
                {summary.detail}
                {overrideCount > 0 ? ` · ${overrideCount} option${overrideCount === 1 ? '' : 's'} set` : ''}
                {destDir ? ` · ${destDir}` : ''}
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {probe.result?.entries?.length ? (
            <Badge tone="info">
              <Radio className="size-2.5" /> playlist
            </Badge>
          ) : null}

          <Button variant="outline" size="md" onClick={() => useApp.getState().setView('options')}>
            Options
          </Button>
          <Button variant="primary" size="md" onClick={handleAdd} className="min-w-[132px]">
            <Download className="size-4" />
            {isBatch ? `Queue ${urls.length}` : 'Add to queue'}
          </Button>
        </div>
      </div>

      <Dialog
        open={presetOpen}
        onOpenChange={setPresetOpen}
        title="Save preset"
        description="Presets capture every option you have set right now."
        width="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPresetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!presetName.trim()) return;
                await window.trawl.presets.save({
                  id: crypto.randomUUID(),
                  name: presetName.trim(),
                  values,
                });
                await refreshPresets();
                setPresetName('');
                setPresetOpen(false);
                toast({ title: 'Preset saved', tone: 'success' });
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void window.trawl.presets
                .save({ id: crypto.randomUUID(), name: presetName.trim(), values })
                .then(refreshPresets);
              setPresetOpen(false);
            }
          }}
          placeholder="e.g. Podcast rip — Opus 128k"
          className="h-10 w-full rounded-lg border border-line-strong bg-ink-raised px-3 text-[13px] text-fg outline-none focus:border-accent/60"
        />
      </Dialog>

      <AdvancedDialog open={advancedOpen} onOpenChange={setAdvancedOpen} />
    </div>
  );
}

function ProbeSkeleton() {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white/[0.02]">
      <div className="flex gap-4 p-4">
        <div className="relative aspect-video w-[228px] shrink-0 overflow-hidden rounded-xl bg-white/5">
          <div className="shimmer-bar absolute inset-0 opacity-20" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5 py-1">
          <div className="h-4 w-3/4 rounded bg-white/6" />
          <div className="h-3 w-1/3 rounded bg-white/4" />
          <div className="h-3 w-1/2 rounded bg-white/4" />
          <div className="mt-auto flex gap-2">
            <div className="h-5 w-16 rounded bg-white/4" />
            <div className="h-5 w-12 rounded bg-white/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const values = useApp((s) => s.values);
  const setValue = useApp((s) => s.setValue);

  const fields: { id: string; label: string; placeholder: string; hint: string }[] = [
    { id: 'sponsorblock-remove', label: 'SponsorBlock', placeholder: 'sponsor,selfpromo', hint: 'Comma separated categories to cut out.' },
    { id: 'download-sections', label: 'Time range', placeholder: '*00:30-00:45', hint: 'Download only part of the video.' },
    { id: 'cookies-from-browser', label: 'Browser cookies', placeholder: 'chrome:Default', hint: 'For private or age-restricted videos.' },
    { id: 'limit-rate', label: 'Speed limit', placeholder: '4.2M', hint: 'Per-download rate cap.' },
    { id: 'proxy', label: 'Proxy', placeholder: 'socks5://127.0.0.1:1080', hint: 'Route traffic through a proxy.' },
    { id: 'sub-langs', label: 'Subtitle languages', placeholder: 'en,en-US', hint: 'Requires subtitles to be enabled.' },
    { id: 'concurrent-fragments', label: 'Concurrent fragments', placeholder: '4', hint: 'Parallel segments — usually a big speedup.' },
    { id: '__extra', label: 'Extra arguments', placeholder: '--no-mtime --geo-bypass', hint: 'Appended verbatim to the command.' },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Less common flags"
      description="Quick access to the ones people actually reach for. Everything else lives in Options."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => (
          <div key={field.id}>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11.5px] font-medium text-fg-soft">{field.label}</label>
              {field.id.startsWith('__') ? null : (
                <code className="font-mono text-[10px] text-fg-dim">--{field.id}</code>
              )}
            </div>
            <input
              value={(values[field.id] as string) ?? ''}
              onChange={(event) => setValue(field.id, event.target.value || undefined)}
              placeholder={field.placeholder}
              spellCheck={false}
              className="h-8.5 w-full rounded-lg border border-line bg-ink-raised px-2.5 font-mono text-[11px] text-fg outline-none transition-colors hover:border-line-strong focus:border-accent/55"
            />
            <div className="mt-1 text-[10px] leading-relaxed text-fg-dim">{field.hint}</div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
