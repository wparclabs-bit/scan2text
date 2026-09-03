# Scan2Text v1.1

A portable, offline desktop app that converts images and PDFs into Markdown — entirely on your machine.

## What it does

Drop PNG, JPG, JPEG, WEBP, or PDF files onto the window and Scan2Text writes one Markdown file per input. Everything runs locally using a vision-language model on your CPU. No internet connection is needed after the first run, no account is required, and nothing leaves your PC.

## Key facts

- **Local-first** — all processing happens on your computer
- **Offline** — works without an internet connection after initial setup
- **CPU-only** — no GPU required
- **Privacy-focused** — no telemetry, no cloud services, no data collection
- **Version v1.1.0**

## Download

Get the latest release from the [Scan2Text GitHub Releases page](https://github.com/WingAI/scan2text/releases).

The public release asset is `Scan2Text-v1.1-Portable-Full.zip`. It includes everything you need — no additional downloads required.

## Install & run

1. Download `Scan2Text-v1.1-Portable-Full.zip` from GitHub Releases.
2. Unzip it into any folder. Keep the contents in a single folder — do not move subfolders elsewhere.
3. Run `Scan2Text.exe`.

That's it. No installer, no admin rights needed.

## Supported inputs

PNG, JPG, JPEG, WEBP, PDF

## Limits

- **Max 10 files per batch** — extra files are skipped with a warning
- **Max 20 MB per file** — oversized files are rejected before processing

## Output

Markdown files are written to the output folder you select on first launch. One `.md` file is created for each valid input, never overwritten and never merged together. A PDF produces one Markdown file assembled from its recognized pages.
