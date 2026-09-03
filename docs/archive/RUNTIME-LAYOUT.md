# Runtime Layout

Scan2Text runs from a portable folder. Every path below is relative to `<app-root>` — the folder
containing `Scan2Text.exe`. Nothing is installed, nothing requires admin rights, and the folder
can be moved or copied to another Windows PC as-is.

## Folder structure

```
<app-root>/
├── Scan2Text.exe             ← Tauri shell; the only entry point users launch
├── backend/
│   ├── scan2text-backend.exe ← PyInstaller folder artifact (FastAPI service)
│   └── _internal/            ← Bundled Python runtime and native libraries
├── models/                   ← GGUF models, downloaded at first run
│   ├── vlm.gguf              ← OvisOCR2 vision-language model (Q8_0, 811 MB)
│   └── mmproj.gguf           ← Paired multimodal projector (f16, 205 MB)
├── output/                   ← Generated .md files, one per valid input
├── logs/                     ← Privacy-safe local logs
├── feedback/                 ← Offline feedback queue
└── settings/
    └── settings.json         ← User configuration
```

`dist/` is never a runtime path. All path resolution derives from `<app-root>` and is centralized
in the backend `PathService`.

## What lives where

| Path | Purpose |
|---|---|
| `models/` | Populated automatically on first run by the model downloader (progress, cancel, size and SHA256 verification against `version.json`). Offline afterwards. |
| `output/` | One Markdown file per valid input: `{original_stem}_{HHmm}_{yyyyMMdd}.md`, collisions suffixed `_2`, `_3`, .... Never overwritten, never merged. |
| `logs/` | `app.log` with 1 MB rotation. Technical events only. |
| `feedback/` | Feedback queued while offline; sent only when the user explicitly submits. Never auto-sent. |
| `settings/settings.json` | User configuration; travels with the folder. |

## Settings

`settings/settings.json` stores the `AppSettings` contract: `output_dir`, `max_pdf_pages`,
`cpu_threads` (`0` = auto), `check_updates_on_startup`, `language` (`auto` | `en` | `id`),
`theme` (`dark` | `light`), `hide_welcome_notice`. Theme and language therefore survive both
restarts and moving the folder between PCs.

## Log privacy rules

- Logs never contain file names, file paths, document content, or OCR text.
- Recorded fields are limited to: file extension, byte count, page count, duration, error code,
  model version, timestamp.
- Redaction is enforced in code (`PrivacyFilter` path/content redaction plus an allow-list
  formatter) — see [SECURITY.md](SECURITY.md).
- Rotation caps each log file at 1 MB.

## Portability rules

- Copy or move `<app-root>` and everything travels: settings, queued feedback, logs, and models.
- No registry entries, no services, no admin rights; run from any user-writable folder.
- One running instance per machine is assumed; the shell cleans up the backend process on exit.
