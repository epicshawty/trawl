# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/epicshawty/trawl/releases/tag/v0.1.0
