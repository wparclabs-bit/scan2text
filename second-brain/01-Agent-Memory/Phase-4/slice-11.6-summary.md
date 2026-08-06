# Slice 11.6 Summary — Backend Multipart Upload & Persistent Storage

**Date:** 2026-08-05
**Status:** Complete

## What Changed

### API Endpoint: `POST /process`

**Before:** The endpoint accepted a JSON body containing local filesystem paths:
```json
POST /process
{ "file_paths": ["/path/to/doc1.png", "/path/to/doc2.pdf"] }
```

**After:** The endpoint now accepts `multipart/form-data` with uploaded files:
```
POST /process
Content-Type: multipart/form-data

files: doc1.png (binary)
files: doc2.pdf (binary)
```

The response format is unchanged: `{ "task_id": "..." }` with HTTP 202.

### New Files/Dirs

- **`uploads/`** directory created at project root to store uploaded files temporarily during processing. Added to `.gitignore` so user files are never committed.
- Each uploaded file is saved with a **UUID-based filename** (e.g., `a1b2c3d4...e5f6.png`) to prevent name collisions.

### Code Changes

| File | Change |
|------|--------|
| `src/scan2text/api/main.py` | Removed `ProcessRequest` Pydantic model. Added `_save_uploaded_file()` async helper. Changed `POST /process` to accept `List[UploadFile] = Form(default=[])`. Files are saved to `uploads/` before being passed to the background worker. Returns 400 if no files provided. |
| `tests/test_api.py` | Updated existing tests to send multipart files instead of JSON. Added `test_post_process_rejects_empty_upload` and `test_post_process_saves_files_to_uploads_dir`. |
| `.gitignore` | Added `uploads/` to prevent committing user-uploaded files. |

## Why Save Files to uploads/

Browsers cannot send local filesystem paths to servers (security restriction). Instead, they send the actual file bytes via `multipart/form-data`. The backend must:

1. **Receive** the raw file bytes from the HTTP request.
2. **Save** them to disk so the OCR pipeline can read them (the existing `VlmOcrAdapter.ocr()` expects a file path).
3. **Process** them through the existing pipeline unchanged.

Saving to `uploads/` with UUID names ensures:
- No filename collisions between concurrent uploads.
- Clean separation between user uploads and project source code.
- Easy cleanup later (delete the whole directory or individual files after processing).

## How to Test Manually

### Using curl

```bash
# Single file
curl -X POST http://localhost:8000/process \
  -F "files=@C:\path\to\document.png"

# Multiple files
curl -X POST http://localhost:8000/process \
  -F "files=@C:\path\to\doc1.png" \
  -F "files=@C:\path\to\doc2.pdf"
```

The response will be:
```json
{ "task_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Then check progress:
```bash
curl http://localhost:8000/status/<task_id>
```

### Using the Frontend (Slice 12)

Once the frontend is connected, dropping files into the DropZone will automatically:
1. Send the files as multipart/form-data to `POST /process`.
2. Display a task card with the returned `task_id`.
3. Update progress in real-time via WebSocket (`/ws/progress`).

## Tests

All 102 backend tests pass (`python -m pytest -q`). New tests added:
- `test_post_process_returns_202` — verifies multipart upload works and saved paths are passed to the queue.
- `test_post_process_rejects_empty_upload` — verifies 400 when no files sent.
- `test_post_process_saves_files_to_uploads_dir` — verifies UUID naming and file persistence.
