import type { DownloadRequest, OptionValue, Settings } from './types';
import { buildOptionArgs, tokenizeArgs } from './options';

export const PROGRESS_PREFIX = '__TRAWL_PROGRESS__';

export const BASE_ARGS = [
  '--ignore-config',
  '--newline',
  '--color',
  'never',
  '--progress-template',
  `download:${PROGRESS_PREFIX}%(progress)j`,
];

export function extraArgTokens(extraArgs: string | undefined): string[] {
  if (!extraArgs?.trim()) return [];
  return tokenizeArgs(extraArgs);
}

export interface BuiltCommand {
  args: string[];
  command: string;
}

/**
 * Assemble the full yt-dlp argv for one download request.
 * Shared by the main process (to run it) and the renderer (to preview it),
 * so what the user sees is exactly what gets executed.
 */
export function buildDownloadArgs(req: DownloadRequest, settings: Settings): BuiltCommand {
  const values: Record<string, OptionValue> = { ...req.values };

  if (!values.output) values.output = settings.template || '%(title)s [%(id)s].%(ext)s';
  if (!values.paths) values.paths = `home:${req.destDir || settings.outputDir}`;

  if (settings.speedLimitEnabled && settings.speedLimitKbps > 0 && !values['limit-rate']) {
    values['limit-rate'] = `${settings.speedLimitKbps}K`;
  }
  if (settings.ffmpegPath && !values['ffmpeg-location']) {
    values['ffmpeg-location'] = settings.ffmpegPath;
  }

  const args = [...BASE_ARGS, ...buildOptionArgs(values), ...extraArgTokens(req.extraArgs), '--', req.url];
  return { args, command: formatCommand(args) };
}

export function formatCommand(args: string[]): string {
  return args
    .map((arg) => (/[\s"'$`]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg))
    .join(' ');
}
