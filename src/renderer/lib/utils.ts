import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatSpeed(bytesPerSecond: number | null | undefined): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '—';
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds <= 0) return 'now';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

export function formatCount(count: number | null | undefined): string {
  if (!count || count <= 0) return '—';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatDate(uploadDate: string | null | undefined): string {
  if (!uploadDate || uploadDate.length !== 8) return '';
  const [y, m, d] = [uploadDate.slice(0, 4), uploadDate.slice(4, 6), uploadDate.slice(6, 8)];
  return `${y}-${m}-${d}`;
}

export const isMac = navigator.userAgent.includes('Mac OS X');

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const URL_RE = /^https?:\/\/\S+$/i;

export function splitUrls(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function looksLikeUrl(value: string): boolean {
  return URL_RE.test(value.trim());
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
