# Usage

Five minutes, no flags.

## 1. Paste a link

Drop one URL (or several, space-separated) into the bar and press **Enter**. Trawl reads the page and shows the thumbnail, uploader, duration, subtitle tracks and every available stream.

## 2. Choose what you get

**Video** — pick a resolution ceiling, container and codec. *Auto* container keeps whatever the site serves; choosing one remuxes to it.

**Audio** — extracts with ffmpeg and converts to the format you pick. Lossless formats skip the quality slider because it doesn't apply.

**Custom** — a raw yt-dlp format expression (`bv*[height<=1080]+ba/b`). The **Available formats** table lets you click an exact stream ID instead.

## 3. Add to queue

**Add to queue** downloads immediately, up to your concurrency limit. The queue supports pause, resume, cancel, retry and reveal-in-folder. Pausing keeps the `.part` file, so resuming continues where it stopped.

## 4. The Options tab

Every yt-dlp flag, in yt-dlp's own groups. Search by name, flag or description. Changed rows are highlighted; the header shows the count and can reset everything.

A row with a **Default / On / Off** shape (like `--abort-on-error` / `--no-abort-on-error`) exposes the explicit negative on hover.

## 5. Save a preset

Any configuration can be saved by name and re-applied with one click. Presets store the raw option map, so they survive yt-dlp updates that don't remove flags.

## 6. When something fails

Open the **Log** tab. It contains the exact argv Trawl executed plus yt-dlp's output, unfiltered. Copy the command into a terminal to reproduce it outside the app.

Useful flags for stubborn sites: `--cookies-from-browser chrome`, `--proxy`, `--extractor-args`, and `--impersonate chrome`.

## How Trawl calls yt-dlp

Every run starts with `--ignore-config`, so your `yt-dlp.conf` never changes what the GUI does. Put anything you need in **Options → Extra arguments** instead — it is appended verbatim and shown in the command preview.

## Portable mode

Drop a file named `portable` next to `Trawl.exe` (or set `TRAWL_PORTABLE=1`) and Trawl keeps **everything** — settings, queue, presets, the yt-dlp binary it downloads, the Chromium profile — inside `data/` in that same folder. Move the folder, and your downloads config moves with it. Delete the folder, and nothing is left behind.

Without the marker, a packaged build behaves like a normal installed app and uses `%APPDATA%/Trawl` (macOS: `~/Library/Application Support/Trawl`, Linux: `~/.config/Trawl`).

## Settings

| Setting | Meaning |
| --- | --- |
| yt-dlp / ffmpeg path | Overrides auto-detection. **Get yt-dlp** downloads the official binary. |
| Save to | Base directory for downloads. |
| Filename template | yt-dlp output template, e.g. `%(uploader)s/%(title)s [%(id)s].%(ext)s`. |
| Parallel downloads | How many jobs run at once. |
| Global speed limit | Applied to every job unless the job overrides `--limit-rate`. |

## Keyboard

`1` `2` `3` `4` switch views · `⌘/Ctrl + ,` settings · `⌘/Ctrl + Enter` analyze · `Esc` closes dialogs.
