# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-11-07

### Fixed

- Portable copies were not portable: settings, queue, presets and a downloaded yt-dlp binary all landed in `%APPDATA%/Trawl`. A file named `portable` next to the executable (or `TRAWL_PORTABLE=1`) now redirects user data — including the Chromium profile — into `<app dir>/data`.
- Settings showed a hardcoded version number instead of the app's real version.

### Changed

- Settings → About shows the active data directory and a `portable` badge.

## [0.1.1] - 2026-11-07

### Fixed

- Option counts in the UI were taken from `--help` rather than from the flags the browser actually exposes.
- Playlists no longer show a meaningless "0 formats" badge.

## [0.1.0] - 2026-11-07

First release.

### Added

- Option registry generated from `yt-dlp --help` (2026.10.26, 245 options, 17 groups), with curated labels, choices and hints on the frequently used ones.
- Download composer: video / audio / custom modes, resolution ceiling, container, codec preference, audio format and quality.
- Metadata probe with thumbnails, chapters, subtitle tracks and a clickable format table.
- Queue with concurrency limit, live percent / speed / ETA, per-stream progress tracking, pause, resume, cancel, retry, reveal and persistent history.
- Download log with the exact yt-dlp argv, copyable, plus unfiltered stdout/stderr.
- Options browser with search, group filters, "changed only" view and tri-state handling of `--x` / `--no-x` pairs.
- Presets that capture the whole option map.
- Binary management: PATH detection, manual path, one-click download of the official yt-dlp build, in-app `yt-dlp -U`.
- Settings for output directory, filename template, concurrency, notifications, reveal-on-complete and global rate limit.
- Frameless window with custom title bar, keyboard shortcuts, light/dark-native scrollbars and a dark UI built on Radix + Tailwind 4.
- GitHub Actions: per-platform builds on tag push, artifacts attached to a GitHub Release.

[0.1.2]: https://github.com/epicshawty/trawl/releases/tag/v0.1.2
[0.1.1]: https://github.com/epicshawty/trawl/releases/tag/v0.1.1
[0.1.0]: https://github.com/epicshawty/trawl/releases/tag/v0.1.0
