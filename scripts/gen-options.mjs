#!/usr/bin/env node
/**
 * Parses `yt-dlp --help` into a machine-readable option registry.
 *
 * The fixture in scripts/fixtures/yt-dlp-help.txt is committed so generation is
 * deterministic offline; refresh it with `yt-dlp --help > scripts/fixtures/yt-dlp-help.txt`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'scripts/fixtures/yt-dlp-help.txt'), 'utf8');
const version = readFileSync(resolve(root, 'scripts/fixtures/yt-dlp-version.txt'), 'utf8').trim();

const GROUP_RE = /^ {2}(\S.*):$/;
const OPTION_RE = /^ {4}(\S.*?)(?: {2,})(\S.*)$/;
const CONTINUATION_RE = /^ {24,}(\S.*)$/;

/** @type {{name: string, options: any[]}[]} */
const groups = [];
let group = null;
let current = null;

for (const raw of source.split(/\r?\n/)) {
  if (!raw.trim()) continue;

  const groupMatch = GROUP_RE.exec(raw);
  if (groupMatch && !raw.startsWith('    ')) {
    group = { name: groupMatch[1], options: [] };
    groups.push(group);
    current = null;
    continue;
  }

  const optionMatch = OPTION_RE.exec(raw);
  if (optionMatch && group) {
    const [, flagsRaw, desc] = optionMatch;
    const tokens = flagsRaw.split(/,\s*/).map((t) => t.trim());

    let short = null;
    let long = null;
    let metavar = null;
    let optionalMetavar = false;

    for (const token of tokens) {
      const [flag, ...rest] = token.split(/\s+/);
      const value = rest.join(' ');
      if (flag.startsWith('--')) {
        long = flag;
        if (value) {
          metavar = value;
          optionalMetavar = value.startsWith('[');
        }
      } else if (flag.startsWith('-') && flag !== '-') {
        short = flag;
      }
    }

    const id = (long ?? short ?? flagsRaw).replace(/^-+/, '');
    current = {
      id,
      group: group.name,
      short,
      long,
      flags: tokens.map((t) => t.split(/\s+/)[0]),
      metavar,
      optionalMetavar,
      desc: desc.trim(),
    };
    group.options.push(current);
    continue;
  }

  const continuation = CONTINUATION_RE.exec(raw);
  if (continuation && current) {
    current.desc += ` ${continuation[1].trim()}`;
  }
}

const payload = {
  version,
  generatedFrom: 'yt-dlp --help',
  groups: groups.filter((g) => g.options.length > 0),
};

const out = resolve(root, 'src/shared/options.generated.json');
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);

const count = payload.groups.reduce((n, g) => n + g.options.length, 0);
console.log(`gen-options: ${count} options in ${payload.groups.length} groups -> src/shared/options.generated.json (yt-dlp ${version})`);
