import generated from './options.generated.json';
import type { OptionGroupSpec, OptionSpec, OptionValue } from './types';

export const YTDLP_VERSION = (generated as { version: string }).version;

/** Options that make no sense (or are destructive) inside a GUI. */
const HIDDEN = new Set([
  // Self-management: Trawl owns the binary.
  'help', 'version', 'update', 'no-update', 'update-to', 'list-extractors',
  'extractor-descriptions', 'list-impersonate-targets', 'plugin-dirs',
  'no-plugin-dirs', 'js-runtimes', 'no-js-runtimes', 'remote-components',
  'no-remote-components', 'config-locations', 'no-config-locations',
  // Pure terminal output / debugging.
  'print', 'dump-json', 'dump-single-json', 'dump-pages', 'write-pages',
  'print-traffic', 'console-title', 'no-progress', 'progress', 'color',
  'quiet', 'no-quiet', 'simulate', 'no-simulate', 'ignore-config', 'alias',
  'preset-alias', 'batch-file', 'no-batch-file', 'load-info-json',
  'cache-dir', 'no-cache-dir', 'rm-cache-dir', 'no-warnings',
  // Listing helpers — the UI renders these itself.
  'list-formats', 'list-subs', 'list-thumbnails',
]);

const rawGroups = (generated as { groups: OptionGroupSpec[] }).groups.filter(
  // "Preset Aliases" parses as five identical `-t` shortcuts, not real flags.
  (group) => group.name !== 'Preset Aliases',
);

const seen = new Set<string>();

/** Every option Trawl exposes, in yt-dlp's own grouping order. */
export const OPTION_GROUPS: OptionGroupSpec[] = rawGroups
  .map((group) => ({
    name: group.name,
    options: group.options.filter((option) => {
      if (HIDDEN.has(option.id)) return false;
      if (seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    }),
  }))
  .filter((group) => group.options.length > 0);

export const OPTIONS: OptionSpec[] = OPTION_GROUPS.flatMap((g) => g.options);
/** Flags the Options tab exposes directly. */
export const OPTION_COUNT = OPTIONS.length;
export const OPTION_BY_ID = new Map(OPTIONS.map((o) => [o.id, o]));

export type FieldKind = 'switch' | 'text' | 'number' | 'select' | 'path' | 'template' | 'multiline';

export interface Choice {
  value: string;
  label: string;
}

export interface Curated {
  label?: string;
  kind?: FieldKind;
  choices?: Choice[];
  placeholder?: string;
  hint?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered in the compact "essentials" strip of the Options tab. */
  star?: boolean;
}

const choices = (...values: string[]): Choice[] =>
  values.map((value) => ({ value, label: value }));

const SPONSOR_CATEGORIES = [
  'sponsor', 'selfpromo', 'interaction', 'intro', 'outro',
  'preview', 'filler', 'music_offtopic',
];

export const CURATED: Record<string, Curated> = {
  // ---- Network -------------------------------------------------------------
  proxy: { label: 'Proxy', placeholder: 'socks5://127.0.0.1:1080', hint: 'Route all traffic through a proxy.' },
  'socket-timeout': { label: 'Socket timeout', kind: 'number', unit: 's', placeholder: '20' },
  'source-address': { label: 'Source address', placeholder: '10.0.0.2' },
  impersonate: { label: 'Impersonate client', placeholder: 'chrome', hint: 'TLS/HTTP fingerprint to mimic, e.g. chrome, safari, firefox-133.' },
  'force-ipv4': { label: 'Force IPv4' },
  'force-ipv6': { label: 'Force IPv6' },
  'enable-file-urls': { label: 'Allow file:// URLs' },

  // ---- Geo -----------------------------------------------------------------
  'geo-verification-proxy': { label: 'Geo verification proxy', placeholder: 'http://proxy:8123' },
  xff: { label: 'X-Forwarded-For', placeholder: '1.2.3.4', hint: 'Claim an IP to the extractor, e.g. "1.2.3.4" or "default:1.2.3.4".' },

  // ---- Selection -----------------------------------------------------------
  'playlist-items': { label: 'Playlist items', placeholder: '1-5,8,10-', hint: 'Ranges are inclusive; e.g. 1-3,7 or "-5" for the first five.' },
  'min-filesize': { label: 'Minimum filesize', placeholder: '50k' },
  'max-filesize': { label: 'Maximum filesize', placeholder: '2G' },
  date: { label: 'Uploaded on', placeholder: 'YYYYMMDD' },
  datebefore: { label: 'Uploaded before', placeholder: 'YYYYMMDD' },
  dateafter: { label: 'Uploaded after', placeholder: 'YYYYMMDD' },
  'match-filters': { label: 'Match filter', kind: 'multiline', placeholder: 'duration > 600\n!is_live', hint: 'One expression per line; all must match.' },
  'break-match-filters': { label: 'Stop on filter miss', kind: 'multiline' },
  'age-limit': { label: 'Age limit', kind: 'number' },
  'download-archive': { label: 'Download archive', kind: 'path', hint: 'Skip anything already listed in this file.' },
  'max-downloads': { label: 'Max downloads', kind: 'number' },
  'break-on-existing': { label: 'Stop at first archived item' },
  'break-per-input': { label: 'Archive limit per input URL' },
  'skip-playlist-after-errors': { label: 'Skip playlist after errors', kind: 'number' },

  // ---- Download ------------------------------------------------------------
  'concurrent-fragments': { label: 'Concurrent fragments', kind: 'number', min: 1, max: 32, placeholder: '1', star: true, hint: 'Parallel DASH/HLS fragments. 4–8 is usually a big speedup.' },
  'limit-rate': { label: 'Rate limit', placeholder: '4.2M', unit: '/s' },
  'throttled-rate': { label: 'Throttled rate', placeholder: '100K' },
  retries: { label: 'Retries', kind: 'number', min: 0, placeholder: '10', star: true },
  'file-access-retries': { label: 'File access retries', kind: 'number', min: 0 },
  'fragment-retries': { label: 'Fragment retries', kind: 'number', min: 0, placeholder: '10' },
  'retry-sleep': { label: 'Retry sleep', placeholder: 'linear=1::2' },
  'skip-unavailable-fragments': { label: 'Skip unavailable fragments' },
  'keep-fragments': { label: 'Keep fragments on disk' },
  'buffer-size': { label: 'Buffer size', placeholder: '1024' },
  'http-chunk-size': { label: 'HTTP chunk size', placeholder: '10M' },
  'playlist-random': { label: 'Shuffle playlist' },
  'lazy-playlist': { label: 'Lazy playlist' },
  'hls-use-mpegts': { label: 'HLS as MPEG-TS' },
  'download-sections': { label: 'Download sections', placeholder: '*00:30-00:45', hint: 'Keep only parts of the video; "*" means from the start.' },
  downloader: { label: 'External downloader', kind: 'select', choices: choices('default', 'aria2c', 'native', 'axel', 'curl', 'wget', 'httpie') },
  'downloader-args': { label: 'Downloader args', kind: 'multiline', placeholder: 'aria2c:-x 16 -s 16 -k 1M' },

  // ---- Filesystem ----------------------------------------------------------
  paths: { label: 'Paths', kind: 'template', placeholder: 'home:/media\n temp:/tmp' },
  output: { label: 'Output template', kind: 'template' },
  'output-na-placeholder': { label: 'Missing field placeholder', placeholder: 'NA' },
  'restrict-filenames': { label: 'ASCII-only filenames' },
  'windows-filenames': { label: 'Windows-safe filenames' },
  'trim-filenames': { label: 'Trim filenames', kind: 'number', min: 1, placeholder: '200' },
  'no-overwrites': { label: 'Never overwrite' },
  'force-overwrites': { label: 'Always overwrite' },
  continue: { label: 'Resume partial files' },
  part: { label: 'Write .part files' },
  mtime: { label: 'Set file mtime' },
  'write-description': { label: 'Save description' },
  'write-info-json': { label: 'Save metadata (.info.json)' },
  'write-playlist-metafiles': { label: 'Save playlist metadata' },
  'clean-info-json': { label: 'Strip private fields from JSON' },
  'write-comments': { label: 'Save comments' },
  cookies: { label: 'Cookies file', kind: 'path', placeholder: 'cookies.txt' },
  'cookies-from-browser': { label: 'Cookies from browser', placeholder: 'chrome:Default', hint: 'browser[:profile], e.g. firefox, chrome:Work, edge.' },

  // ---- Thumbnails ----------------------------------------------------------
  'write-thumbnail': { label: 'Save thumbnail' },
  'write-all-thumbnails': { label: 'Save all thumbnail sizes' },

  // ---- Verbosity -----------------------------------------------------------
  'ignore-errors': { label: 'Ignore errors', star: true },
  'ignore-no-formats-error': { label: 'Ignore "no formats" error' },
  'force-write-archive': { label: 'Force archive write' },
  newline: { label: 'Line-buffered progress' },
  verbose: { label: 'Verbose output' },
  'progress-delta': { label: 'Progress interval', kind: 'number', unit: 's', min: 0, step: 0.1 },

  // ---- Workarounds ---------------------------------------------------------
  encoding: { label: 'Force encoding', placeholder: 'utf-8' },
  'legacy-server-connect': { label: 'Legacy server connect' },
  'no-check-certificates': { label: 'Skip certificate validation' },
  'prefer-insecure': { label: 'Prefer insecure connections' },
  'add-headers': { label: 'Extra headers', kind: 'multiline', placeholder: 'Authorization:Bearer …\nX-Api-Key:…' },
  'bidi-workaround': { label: 'Bidirectional text workaround' },
  'sleep-requests': { label: 'Sleep between requests', kind: 'number', unit: 's' },
  'sleep-interval': { label: 'Sleep before each download', kind: 'number', unit: 's' },
  'max-sleep-interval': { label: 'Max sleep', kind: 'number', unit: 's' },
  'sleep-subtitles': { label: 'Sleep before subtitles', kind: 'number', unit: 's' },

  // ---- Format --------------------------------------------------------------
  'format-sort': { label: 'Format sort order', kind: 'template', placeholder: 'res:720,fps' },
  'format-sort-reset': { label: 'Reset format sort' },
  'format-sort-force': { label: 'Force format sort' },
  'video-multistreams': { label: 'Allow multi-stream video' },
  'audio-multistreams': { label: 'Allow multi-stream audio' },
  'prefer-free-formats': { label: 'Prefer free formats' },
  'check-formats': { label: 'Check formats' },
  'check-all-formats': { label: 'Check all formats' },

  // ---- Subtitles -----------------------------------------------------------
  'write-subs': { label: 'Download subtitles', star: true },
  'write-auto-subs': { label: 'Download auto-generated subs' },
  'sub-format': { label: 'Subtitle format', kind: 'select', choices: choices('best', 'srt', 'vtt', 'ass', 'lrc', 'ttml') },
  'sub-langs': { label: 'Subtitle languages', placeholder: 'en,en-US,all', hint: 'Comma separated. "all" grabs every language.' },

  // ---- Authentication ------------------------------------------------------
  username: { label: 'Username' },
  password: { label: 'Password' },
  twofactor: { label: 'Two-factor code' },
  netrc: { label: 'Use .netrc' },
  'netrc-location': { label: '.netrc location', kind: 'path' },
  'netrc-cmd': { label: '.netrc command' },
  'video-password': { label: 'Video password' },
  'client-certificate': { label: 'Client certificate', kind: 'path' },
  'ap-mso': { label: 'Adobe Pass MSO' },
  'ap-username': { label: 'Adobe Pass username' },
  'ap-password': { label: 'Adobe Pass password' },
  'ap-list-mso': { label: 'List Adobe Pass MSOs' },

  // ---- Post-processing -----------------------------------------------------
  'audio-format': { label: 'Audio format', kind: 'select', star: true, choices: choices('best', 'aac', 'alac', 'flac', 'm4a', 'mp3', 'opus', 'vorbis', 'wav') },
  'audio-quality': { label: 'Audio quality', kind: 'select', choices: [...choices('best', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10')] },
  'remux-video': { label: 'Remux to container', kind: 'select', star: true, choices: choices('mp4', 'mkv', 'webm', 'mov', 'avi', 'gif') },
  'recode-video': { label: 'Recode video', kind: 'select', choices: choices('mp4', 'mkv', 'webm', 'mov', 'avi', 'gif') },
  'postprocessor-args': { label: 'Postprocessor args', kind: 'multiline', placeholder: 'FFmpeg:-crf 20 -preset slow' },
  'keep-video': { label: 'Keep original after conversion' },
  'post-overwrites': { label: 'Overwrite post-processed files' },
  'embed-subs': { label: 'Embed subtitles', star: true },
  'embed-thumbnail': { label: 'Embed thumbnail', star: true },
  'embed-metadata': { label: 'Embed metadata', star: true },
  'embed-chapters': { label: 'Embed chapters' },
  'embed-info-json': { label: 'Embed metadata JSON' },
  xattrs: { label: 'Write extended attributes' },
  'concat-playlist': { label: 'Concatenate playlist', kind: 'select', choices: choices('never', 'always', 'multi_video') },
  fixup: { label: 'Fixup policy', kind: 'select', choices: choices('never', 'warn', 'detect_or_warn', 'ignore', 'abort') },
  'ffmpeg-location': { label: 'FFmpeg location', kind: 'path' },
  exec: { label: 'Run command after download', kind: 'template', placeholder: 'after_move:echo %(filepath)q' },
  'convert-subs': { label: 'Convert subtitles to', kind: 'select', choices: choices('srt', 'ass', 'lrc', 'vtt', 'best') },
  'convert-thumbnails': { label: 'Convert thumbnails to', kind: 'select', choices: choices('jpg', 'png', 'webp') },
  'split-chapters': { label: 'Split by chapter', star: true },
  'remove-chapters': { label: 'Remove chapters', kind: 'multiline', placeholder: 'intro\n/sponsor/' },
  'force-keyframes-at-cuts': { label: 'Force keyframes at cuts' },

  // ---- SponsorBlock --------------------------------------------------------
  'sponsorblock-mark': { label: 'Mark segments', kind: 'select', choices: SPONSOR_CATEGORIES.map((c) => ({ value: c, label: c })) },
  'sponsorblock-remove': { label: 'Remove segments', kind: 'select', star: true, choices: SPONSOR_CATEGORIES.map((c) => ({ value: c, label: c })) },
  'sponsorblock-api': { label: 'SponsorBlock API', placeholder: 'https://sponsor.ajay.app' },

  // ---- Extractor -----------------------------------------------------------
  'extractor-retries': { label: 'Extractor retries', kind: 'number', min: 0 },
  'allow-dynamic-mpd': { label: 'Allow dynamic MPD' },
  'ignore-dynamic-mpd': { label: 'Ignore dynamic MPD' },
  'hls-split-discontinuity': { label: 'Split HLS at discontinuities' },
  'extractor-args': { label: 'Extractor args', kind: 'multiline', placeholder: 'youtube:player_client=web_safari' },
};

const ACRONYMS: Record<string, string> = {
  ipv4: 'IPv4', ipv6: 'IPv6', http: 'HTTP', hls: 'HLS', mpd: 'MPD', ffmpeg: 'FFmpeg',
  json: 'JSON', ascii: 'ASCII', url: 'URL', urls: 'URLs', api: 'API', mso: 'MSO',
  crf: 'CRF', tls: 'TLS', hdr: 'HDR', fps: 'FPS', srt: 'SRT', vtt: 'VTT', ass: 'ASS',
  id: 'ID', xattrs: 'xattrs',
};

export function humanize(id: string): string {
  return id
    .split('-')
    .map((part) => ACRONYMS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/^No /, '')
    .trim();
}

/** Positive flag + optional negating flag for a boolean-ish group of options. */
export interface BooleanGroup {
  id: string;
  on: string;
  off: string | null;
  spec: OptionSpec;
  negative?: OptionSpec;
}

export interface RegistryField extends BooleanGroup {
  kind: FieldKind;
  label: string;
  curated?: Curated;
  textSpec?: OptionSpec;
}

const byId = new Map(OPTIONS.map((o) => [o.id, o]));
const consumed = new Set<string>();

/** Controls that live in the Download composer rather than the option browser. */
export const PRIMARY_CONTROL_IDS = new Set([
  'format', 'output', 'extract-audio', 'merge-output-format', 'paths',
]);

function buildFields(): RegistryField[] {
  const fields: RegistryField[] = [];

  for (const spec of OPTIONS) {
    if (consumed.has(spec.id)) continue;

    // `--no-x` / `--yes-x` where `x` is itself a flag: fold into that flag's row,
    // which is processed later in the list and picks this up as its "off" value.
    const negation = /^(?:no|yes)-(.+)$/.exec(spec.id);
    if (negation && byId.has(negation[1])) continue;

    const curated = CURATED[spec.id];

    // 1. `--yes-x` / `--no-x` twins where `x` itself is not a flag (e.g. playlist).
    if (/^(no|yes)-/.test(spec.id)) {
      const base = spec.id.replace(/^(no|yes)-/, '');
      const twinId = spec.id.startsWith('no-') ? `yes-${base}` : `no-${base}`;
      const twin = byId.get(twinId);
      if (twin && !twin.metavar && !spec.metavar) {
        consumed.add(twin.id);
        const offSpec = spec.id.startsWith('no-') ? spec : twin;
        const onSpec = spec.id.startsWith('no-') ? twin : spec;
        fields.push({
          id: base,
          on: onSpec.long ?? `--${onSpec.id}`,
          off: offSpec.long ?? `--${offSpec.id}`,
          spec: onSpec,
          negative: offSpec,
          kind: 'switch',
          label: curated?.label ?? humanize(base),
          curated,
        });
        continue;
      }
    }

    // 2. Plain boolean switches.
    if (!spec.metavar) {
      const negated = byId.get(`no-${spec.id}`);
      const affiliate = byId.get(`yes-${spec.id}`);
      if (negated) consumed.add(negated.id);
      if (affiliate) consumed.add(affiliate.id);
      fields.push({
        id: spec.id,
        on: spec.long ?? spec.short ?? `--${spec.id}`,
        off: negated?.long ?? affiliate?.long ?? null,
        spec,
        negative: negated ?? affiliate,
        kind: 'switch',
        label: curated?.label ?? humanize(spec.id),
        curated,
      });
      continue;
    }

    // 3. Valued options. A `--no-x` twin is meaningless here (empty = default).
    consumed.add(`no-${spec.id}`);
    fields.push({
      id: spec.id,
      on: spec.long ?? spec.short ?? `--${spec.id}`,
      off: null,
      spec,
      kind: curated?.kind ?? inferKind(spec),
      label: curated?.label ?? humanize(spec.id),
      curated,
      textSpec: spec,
    });
  }

  return fields;
}

function inferKind(spec: OptionSpec): FieldKind {
  const mv = (spec.metavar ?? '').toUpperCase();
  if (mv.includes('FILE') || mv.includes('PATH') || mv.includes('DIR')) return 'path';
  if (mv.includes('TEMPLATE') || mv.includes('CMD')) return 'template';
  if (mv === 'NUMBER' || mv === 'SECONDS' || mv === 'COUNT') return 'number';
  if (mv.startsWith('[')) return 'text';
  return 'text';
}

export const FIELDS = buildFields();

export const FIELDS_BY_GROUP: { name: string; fields: RegistryField[] }[] = OPTION_GROUPS.map((group) => {
  const ids = new Set(group.options.map((o) => o.id));
  return {
    name: group.name,
    fields: FIELDS.filter(
      (f) => (ids.has(f.spec.id) || ids.has(f.id)) && !PRIMARY_CONTROL_IDS.has(f.id),
    ),
  };
}).filter((g) => g.fields.length > 0);

export const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]));

/** Turn the UI value map into yt-dlp CLI arguments. Order is deterministic. */
export function buildOptionArgs(values: Record<string, OptionValue>): string[] {
  const args: string[] = [];

  for (const field of FIELDS) {
    const value = values[field.id];
    if (value === undefined || value === null || value === '') continue;

    if (field.kind === 'switch') {
      if (value === true) args.push(field.on);
      else if (value === false && field.off) args.push(field.off);
      continue;
    }

    if (typeof value !== 'string') continue;
    const lines = field.kind === 'multiline' ? value.split(/\r?\n/).filter((l) => l.trim()) : [value];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // CSV values (e.g. sponsorblock categories) stay a single argument.
      args.push(field.on, trimmed);
    }
  }

  return args;
}

/** Split a raw extra-args string into argv tokens, honouring quotes. */
export function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}
