import type { FormatInfo, ProbeResult } from '@shared/types';
import { formatBytes } from './utils';

export type ComposerMode = 'video' | 'audio' | 'custom';
export type Codec = 'any' | 'h264' | 'vp9' | 'av1';

const CODEC_FILTER: Record<Codec, string | null> = {
  any: null,
  h264: 'vcodec^=avc1',
  vp9: 'vcodec^=vp9',
  av1: 'vcodec^=av01',
};

export interface VideoTarget {
  height: number | null;
  fps: number | null;
  codec: Codec;
  container: string | null;
}

/**
 * Build a yt-dlp format expression.
 *
 * Prefers "best video + best audio", then falls back to a progressive stream,
 * then to anything that satisfies the height ceiling.
 */
export function buildVideoFormat({ height, fps, codec, container }: VideoTarget): string {
  const filters: string[] = [];
  if (height) filters.push(`height<=${height}`);
  if (fps) filters.push(`fps<=${fps}`);
  const codecFilter = CODEC_FILTER[codec];
  if (codecFilter) filters.push(codecFilter);

  const vSel = `bv*${filters.map((f) => `[${f}]`).join('')}`;
  const aSel = codec === 'h264' ? 'ba[acodec^=mp4a]' : 'ba';

  const fallback = filters.length ? `b[${filters.join('][')}]` : 'b';

  if (!container) {
    return `${vSel}+${aSel}/${fallback}`;
  }

  const withExt = [...filters, `ext=${container}`];
  const vExt = `bv*${withExt.map((f) => `[${f}]`).join('')}`;
  const aExt = codec === 'h264' ? 'ba[ext=m4a]' : `ba[ext=${container === 'mp4' ? 'm4a' : container}]`;

  // Prefer the requested container, then fall back to it progressively,
  // then to any container that satisfies the quality ceiling.
  return [
    `${vExt}+${aExt}`,
    `b[${withExt.join('][')}]`,
    `${vSel}+${aSel}`,
    fallback,
  ].join('/');
}

export function describeFormat(format: FormatInfo): string {
  const bits: string[] = [];
  if (format.height) bits.push(`${format.height}p`);
  else if (format.resolution && format.resolution !== 'audio only') bits.push(format.resolution);
  if (format.fps) bits.push(`${format.fps}fps`);
  if (format.dynamic_range && format.dynamic_range !== 'SDR') bits.push(format.dynamic_range);
  return bits.join(' · ') || format.format_note || format.format_id;
}

export function formatCodec(format: FormatInfo): string {
  const codec = format.vcodec && format.vcodec !== 'none' ? format.vcodec : format.acodec;
  if (!codec || codec === 'none') return '—';
  return codec.split('.')[0].replace(/^avc1$/, 'h264');
}

export function formatSize(format: FormatInfo): string {
  return formatBytes(format.filesize ?? format.filesize_approx ?? null);
}

export function isAudioOnly(format: FormatInfo): boolean {
  return (!format.vcodec || format.vcodec === 'none') && Boolean(format.acodec && format.acodec !== 'none');
}

export function isVideoOnly(format: FormatInfo): boolean {
  return Boolean(format.vcodec && format.vcodec !== 'none') && (!format.acodec || format.acodec === 'none');
}

/** Sort formats the way a person would: highest quality video first. */
export function sortFormats(formats: FormatInfo[]): FormatInfo[] {
  return [...formats].sort((a, b) => {
    const av = isAudioOnly(a) ? 0 : 1;
    const bv = isAudioOnly(b) ? 0 : 1;
    if (av !== bv) return bv - av;
    const h = (b.height ?? 0) - (a.height ?? 0);
    if (h !== 0) return h;
    return (b.tbr ?? 0) - (a.tbr ?? 0);
  });
}

/** Human summary of what a queued job will produce. */
export function summariseTarget(
  mode: ComposerMode,
  video: VideoTarget,
  audioFormat: string,
  probe: ProbeResult | null,
): { title: string; detail: string } {
  if (mode === 'audio') {
    return {
      title: 'Audio only',
      detail: probe ? `${audioFormat.toUpperCase()} · ${probe.title.slice(0, 48)}` : audioFormat.toUpperCase(),
    };
  }
  if (mode === 'custom') {
    return { title: 'Custom format', detail: 'Explicit format expression' };
  }
  const quality = video.height ? `${video.height}p` : 'Best available';
  const bits = [quality];
  if (video.fps) bits.push(`${video.fps}fps`);
  if (video.codec !== 'any') bits.push(video.codec.toUpperCase());
  if (video.container) bits.push(video.container.toUpperCase());
  return { title: 'Video', detail: bits.join(' · ') };
}

export const HEIGHT_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Best', value: null },
  { label: '2160p', value: 2160 },
  { label: '1440p', value: 1440 },
  { label: '1080p', value: 1080 },
  { label: '720p', value: 720 },
  { label: '480p', value: 480 },
  { label: '360p', value: 360 },
];

export interface ParsedTarget {
  height: number | null;
  fps: number | null;
  codec: Codec;
  container: string | null;
}

/** Recover the friendly composer state from a raw yt-dlp format expression. */
export function parseVideoFormat(expr: string | undefined, container: string | undefined): ParsedTarget {
  const source = expr ?? '';
  const height = /height<=(\d+)/.exec(source)?.[1];
  const fps = /fps<=(\d+)/.exec(source)?.[1];
  let codec: Codec = 'any';
  if (/vcodec\^=avc1/.test(source)) codec = 'h264';
  else if (/vcodec\^=vp0?9/.test(source)) codec = 'vp9';
  else if (/vcodec\^=av01/.test(source)) codec = 'av1';
  return {
    height: height ? Number(height) : null,
    fps: fps ? Number(fps) : null,
    codec,
    container: container ?? null,
  };
}

export function isVideoExpression(expr: string | undefined): boolean {
  if (!expr) return true;
  return /^(bv\*|b\[|bestvideo|bv\+|ba\/b|b$)/.test(expr) || /height<=/.test(expr) || /vcodec\^=/.test(expr);
}
