# Scan2Text

Scan2Text is a portable, offline, CPU-only OCR appliance for Windows. Drop images or PDFs into the
window, and Scan2Text writes one Markdown file per input. Documents are processed entirely on your
machine — nothing leaves the PC.

Recognition runs on a local vision-language model (OvisOCR2 0.9B, GGUF quantization) executed by
llama-cpp-python on the CPU. No GPU, no account, no cloud service.

## Features

- Drag-and-drop or click-to-browse input; files process automatically in FIFO order.
- One Markdown file per valid input, auto-saved to your output folder.
- Live Markdown preview; copy or open the output folder from the app.
- Fully offline after the first model download.
- Dark theme by default, light toggle; English and Indonesian UI, auto-detected.
- Portable: no installer, no admin rights, preferences travel with the folder.

## Install

Two portable ZIPs are available on the Scan2Text GitHub Releases page:

| Package | Size | Description |
|---|---|---|
| **Thin** (`Scan2Text-v1.1-Portable.zip`) | ~81 MB | Fast download. Downloads models (~1 GB) on first run. |
| **Full** (`Scan2Text-v1.1-Portable-Full.zip`) | ~1.1 GB | Models included. Works offline immediately after unzip. |

1. Download the ZIP that suits your needs.
2. Unzip it to any user-writable folder.
3. Run `Scan2Text.exe`.

There is no installer and no admin rights requirement. Plan for 8 GB RAM minimum (16 GB recommended) and at least 5 GB free disk space.

## Quick start

1. Launch `Scan2Text.exe`.
2. On first run, accept the expectations notice and pick an output folder.
3. On first run the app downloads the OCR models automatically (about 1 GB (811 MB + 205 MB)). This is the only step
   that needs internet; afterwards the app is fully offline. [VERIFY: exact combined model size as
   shipped in the release]
4. Drop PNG, JPG, JPEG, WEBP, or PDF files onto the window.
5. Collect your `.md` files from the output folder, or copy them straight from the preview pane.

## Limits

| Limit | Value | Notes |
|---|---|---|
| File size (all types, incl. PDF) | 20 MB | Checked before queuing |
| PDF pages | 50 | Checked before rendering |
| Batch size | 10 files per drop | Extras are skipped with a warning and logged |
| Supported types | PNG, JPG, JPEG, WEBP, PDF | Anything else is rejected with a toast |

Invalid files never enter the queue and never block valid ones.

## Output

- One `.md` per valid input. Files are never merged and never overwritten.
- Naming: `{original_stem}_{HHmm}_{yyyyMMdd}.md`; on collision a `_2`, `_3`, ... suffix is added.
- A PDF produces one Markdown file assembled from its successfully recognized pages.
- Scan2Text is not a document editor — edit the output in your own tools.

## Build from source

Prerequisites: Python 3.12 (`py -3.12`), Node.js with npm, and the Rust toolchain. See
[docs/BUILD-AND-RELEASE.md](docs/BUILD-AND-RELEASE.md) for the full build, packaging, and release
procedure.

## Security

Scan2Text is local-first: the backend listens only on `127.0.0.1:47351`, logs are redacted and
contain no file names or content, downloaded models are SHA256-verified, and there is no telemetry.
See [docs/SECURITY.md](docs/SECURITY.md) for the threat model and how to report vulnerabilities.

## Troubleshooting

- **App will not start / backend errors.** The backend API binds to `127.0.0.1:47351`. At startup
  the app removes a stale process holding that port (self-heal). If failures persist, check whether
  another program is bound to port 47351.
- **Where are the logs?** `<app-root>/logs/app.log`, rotated at 1 MB. Logs record technical events
  only — never file names or document content.
- **Model download failed.** Re-run the app to retry; downloads are resumed from scratch and
  verified by SHA256 before use. See [docs/RUNTIME-LAYOUT.md](docs/RUNTIME-LAYOUT.md).
- **A file was rejected.** Check the Limits table above; oversized PDFs and unsupported types are
  refused up front with a message.

## Known Issues

- v1.0.0: when a file is rejected as too complex (`FILE_TOO_COMPLEX`), the queue row tooltip may
  show a generic failure message instead of the specific translated reason. The file is still
  correctly rejected and logged. Fixed in v1.1.

## License

Scan2Text is licensed under the Apache-2.0 license — see [LICENSE](LICENSE).
Third-party components and model attributions are listed in [NOTICE.md](NOTICE.md).
