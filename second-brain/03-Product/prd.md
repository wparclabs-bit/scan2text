# Product Requirements Document — Scan2Text

## Problem

Users need a fast, private way to convert scanned images and PDFs into editable Markdown text. Commercial OCR tools require internet connectivity and upload documents to remote servers, raising privacy concerns.

## Solution

A local-first desktop application that runs OCR entirely on the user's machine using `llama-cpp-python`. Images and PDFs are dropped into the app, processed offline, and rendered as rich Markdown output.

## User Flow

1. **User drops files** into the DropZone component (or clicks to browse).
2. **Frontend shows optimistic cards** immediately — each file appears as a card with a "queued" status and a placeholder progress bar, before the backend has responded.
3. **Backend accepts the upload** via `multipart/form-data`, saves the files locally, assigns each batch a unique `task_id`, and returns it in a `202 Accepted` response.
4. **WebSocket updates progress** — the backend broadcasts real-time progress messages (`{ task_id, status, processed, total }`) over `WS /ws/progress` as each file is OCR'd. The frontend updates each card's progress bar and status accordingly.
5. **Completed Markdown is rendered richly** — when a task finishes, the backend sends a `"completed"` message containing the full Markdown result. The frontend renders it with proper formatting (headings, lists, code blocks) instead of raw text.

## Key Constraints

- All processing happens locally; no data leaves the machine.
- Multiple files can be uploaded concurrently; each gets its own progress track.
- The app works offline after initial install.

## Current Status

Phase 4 (Frontend Architecture) is in progress. Backend queue/API (Slice 8), frontend scaffold (Slice 9), frontend TDD store/socket/DropZone (Slice 10), and backend WebSockets with task-specific status (Slice 11) are complete. The next slice will update the backend to accept multipart file uploads, closing the gap between the browser frontend and the processing pipeline.
