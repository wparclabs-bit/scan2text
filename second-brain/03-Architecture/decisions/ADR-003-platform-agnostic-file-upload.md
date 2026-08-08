# ADR-003: Platform-Agnostic Multipart File Upload

**Status:** Accepted
**Date:** 2026-08-05
**Context:** The original backend API accepted `file_paths` — local filesystem paths to image/PDF files. This works for a CLI or desktop app but fails for a browser-based frontend because: (1) browsers cannot reliably expose the full local path of a selected file for security reasons, and (2) sending arbitrary local paths to a server is a security risk. The frontend must send the actual file bytes instead.

**Decision:** The frontend uploads binary files using `multipart/form-data`. The backend receives the uploaded file(s), saves them to a temporary local directory, runs OCR on the saved files, and returns the result. The frontend never sends local file paths.

**Consequences:**
- **Positive:** Works identically across all platforms (Windows, macOS, Linux) and all browsers without path-related quirks.
- **Positive:** More secure — the server controls where uploaded files are stored and when they are cleaned up.
- **Negative:** The backend must manage temporary file storage and cleanup, adding complexity to the processing pipeline.
- **Negative:** Large files consume server disk space during processing. A cleanup job or in-memory processing stream would be needed for production scale.
- **Required change:** `POST /process` must switch from JSON body with `file_paths` to `multipart/form-data` with file fields. This is tracked as the next backend slice's task.
