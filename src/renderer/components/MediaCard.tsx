import { useMemo, useState } from 'react';
import { ChevronDown, Eye, ListVideo, Radio, Calendar, Layers, Subtitles, ExternalLink } from 'lucide-react';
import type { FormatInfo, ProbeResult } from '@shared/types';
import { cn, formatCount, formatDate, formatDuration, hostOf } from '@/lib/utils';
import { Badge, SectionLabel } from './ui/Misc';
import { describeFormat, formatCodec, formatSize, isAudioOnly, isVideoOnly, sortFormats } from '@/lib/format';

function ThumbFallback({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[radial-gradient(120%_120%_at_20%_0%,rgba(139,92,246,0.20),transparent_60%),radial-gradient(100%_100%_at_100%_100%,rgba(34,211,238,0.12),transparent_55%)]">
      <div className="flex flex-col items-center gap-1.5 text-fg-dim">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
          <path d="M7 4.5v15M17 4.5v15M2.5 9.5h4.5M17 9.5h4.5M2.5 14.5h4.5M17 14.5h4.5" opacity="0.6" />
        </svg>
        <span className="text-[9.5px] tracking-[0.14em] uppercase">{label}</span>
      </div>
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-dim">
      <span className="text-fg-dim/70">{icon}</span>
      {children}
    </span>
  );
}

export function MediaCard({
  result,
  onPickFormat,
}: {
  result: ProbeResult;
  onPickFormat: (format: FormatInfo) => void;
}) {
  const [showFormats, setShowFormats] = useState(false);
  const [showEntries, setShowEntries] = useState(false);

  const formats = useMemo(() => sortFormats(result.formats ?? []), [result.formats]);
  const isPlaylist = Boolean(result.entries?.length);
  const subtitleLangs = Object.keys(result.subtitles ?? {}).length;

  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-white/[0.045] to-white/[0.015] shadow-[0_24px_60px_-40px_rgba(0,0,0,1)]">
      <div className="flex gap-4 p-4">
        <div className="relative aspect-video w-[236px] shrink-0 overflow-hidden rounded-xl border border-white/8 bg-ink-raised">
          {result.thumbnail ? (
            <img src={result.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <ThumbFallback label={result.extractor_key ?? 'media'} />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          {result.duration ? (
            <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10.5px] font-medium text-white/90 backdrop-blur">
              {formatDuration(result.duration)}
            </span>
          ) : null}
          {result.is_live ? (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-rose/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
              <Radio className="size-2.5" /> Live
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <h2 className="line-clamp-2 flex-1 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-fg">
              {result.title || 'Untitled'}
            </h2>
            <Badge tone="accent" className="mt-0.5 shrink-0">
              {result.extractor_key === 'Youtube' ? 'YouTube' : (result.extractor_key ?? hostOf(result.webpage_url))}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {result.uploader || result.channel ? (
              <span className="text-[12px] font-medium text-fg-soft">{result.uploader ?? result.channel}</span>
            ) : null}
            {result.view_count ? <Meta icon={<Eye className="size-3" />}>{formatCount(result.view_count)} views</Meta> : null}
            {result.upload_date ? <Meta icon={<Calendar className="size-3" />}>{formatDate(result.upload_date)}</Meta> : null}
            {isPlaylist ? (
              <Meta icon={<ListVideo className="size-3" />}>
                {result.playlist_count ?? result.entries?.length} items
              </Meta>
            ) : null}
            {subtitleLangs > 0 ? <Meta icon={<Subtitles className="size-3" />}>{subtitleLangs} subtitle tracks</Meta> : null}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-2.5">
            <Badge>
              {formats.length} {formats.length === 1 ? 'format' : 'formats'}
            </Badge>
            {result.chapters?.length ? <Badge tone="info">{result.chapters.length} chapters</Badge> : null}
            {result.age_limit ? <Badge tone="warn">{result.age_limit}+</Badge> : null}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => window.trawl.system.openExternal(result.webpage_url)}
              className="inline-flex items-center gap-1 text-[11.5px] text-fg-dim transition-colors hover:text-fg-soft"
            >
              <ExternalLink className="size-3" /> Open source page
            </button>
          </div>
        </div>
      </div>

      {result.description ? (
        <div className="border-t border-line px-4 py-3">
          <p className="line-clamp-2 text-[11.5px] leading-relaxed text-fg-dim">{result.description}</p>
        </div>
      ) : null}

      {isPlaylist ? (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setShowEntries((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3"
          >
            <ListVideo className="size-3.5 text-fg-dim" />
            <SectionLabel className="text-fg-dim">Playlist contents</SectionLabel>
            <span className="flex-1" />
            <span className="text-[11px] text-fg-dim">{showEntries ? 'Hide' : `Show ${result.entries?.length ?? 0}`}</span>
            <ChevronDown className={cn('size-3.5 text-fg-dim transition-transform', showEntries && 'rotate-180')} />
          </button>
          {showEntries ? (
            <div className="max-h-56 overflow-y-auto border-t border-line/60 px-2 py-1.5">
              {result.entries?.map((entry, index) => (
                <div
                  key={`${entry.id}-${index}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] text-fg-soft hover:bg-white/4"
                >
                  <span className="w-6 shrink-0 text-right font-mono text-[10.5px] text-fg-dim">{index + 1}</span>
                  <span className="truncate">{entry.title ?? entry.id}</span>
                  <span className="flex-1" />
                  <span className="shrink-0 font-mono text-[10.5px] text-fg-dim">{formatDuration(entry.duration)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {formats.length ? (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setShowFormats((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3"
          >
            <Layers className="size-3.5 text-fg-dim" />
            <SectionLabel className="text-fg-dim">Available formats</SectionLabel>
            <span className="flex-1" />
            <span className="text-[11px] text-fg-dim">{showFormats ? 'Hide' : 'Pick an exact stream'}</span>
            <ChevronDown className={cn('size-3.5 text-fg-dim transition-transform', showFormats && 'rotate-180')} />
          </button>

          {showFormats ? (
            <div className="max-h-[300px] overflow-y-auto border-t border-line/60">
              <table className="w-full border-collapse text-[11.5px]">
                <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
                  <tr className="text-left text-[10px] tracking-[0.08em] text-fg-dim uppercase">
                    <th className="px-4 py-1.5 font-medium">ID</th>
                    <th className="px-2 py-1.5 font-medium">Quality</th>
                    <th className="px-2 py-1.5 font-medium">Codec</th>
                    <th className="px-2 py-1.5 font-medium">Ext</th>
                    <th className="px-2 py-1.5 font-medium">Size</th>
                    <th className="px-4 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {formats.map((format) => (
                    <tr
                      key={format.format_id}
                      className="group cursor-pointer border-t border-line/40 transition-colors hover:bg-accent/8"
                      onClick={() => onPickFormat(format)}
                    >
                      <td className="px-4 py-1.5 font-mono text-[10.5px] text-fg-dim">{format.format_id}</td>
                      <td className="px-2 py-1.5 text-fg-soft">
                        {describeFormat(format)}
                        {isVideoOnly(format) ? <span className="ml-1.5 text-[10px] text-fg-dim">video only</span> : null}
                        {isAudioOnly(format) ? <span className="ml-1.5 text-[10px] text-fg-dim">audio</span> : null}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[10.5px] text-fg-dim">{formatCodec(format)}</td>
                      <td className="px-2 py-1.5 text-fg-dim">{format.ext}</td>
                      <td className="px-2 py-1.5 font-mono text-[10.5px] text-fg-dim">{formatSize(format)}</td>
                      <td className="px-4 py-1.5 text-right">
                        <span className="text-[10.5px] text-accent-soft opacity-0 transition-opacity group-hover:opacity-100">
                          use →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
