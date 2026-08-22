# CEO Final Exam — Phase 10 Portable Backend OCR Path Fix

## 🧠 The Goal

Prove that the portable app at `D:\Scan2Text` can successfully boot the backend, find the 969MB AI models in the correct folder, and convert an image to Markdown without crashing or silently failing.

## 📋 Pre-Flight Checklist (Disk Truth)

Before launching the app, we must prove the files are exactly where they should be.

- **Check Portable Root:** Open `D:\Scan2Text`.
- **Verify Tauri Exe:** `Scan2Text.exe` exists (approx. 8-10 MB).
- **Verify Backend Exe:** `dist\scan2text-backend\scan2text-backend.exe` exists (approx. 45 MB).
- **Verify Models:** `models\vlm.gguf` (811 MB) and `models\mmproj.gguf` (204 MB) exist.
- **Kill Ghost Processes:** Open Task Manager. Search for `scan2text-backend` or `Scan2Text`. If any are running, **End Task** on all of them. (We need a clean boot).
- **Clear Old Logs:** Delete all files inside `D:\Scan2Text\logs\` so we get fresh boot logs.

## 🚀 Phase 1: Boot & Diagnostics (The Black Box Test)

We need to prove the Rust launcher is correctly starting the Python backend and writing to the new boot log.

- **Launch:** Double-click `D:\Scan2Text\Scan2Text.exe`.
- **UI Check:** The Command Center UI appears. Dark mode default. No crashes.
- **Log Check (CRITICAL):**
    - Navigate to `D:\Scan2Text\logs\` (or `D:\Scan2Text\dist\scan2text-backend\logs\`).
    - Verify `backend-boot.log` **exists** and is **greater than 0 bytes**. (Previously, Rust silenced this. If it's 0 bytes or missing, the Rust fix failed).
    - Open `backend-boot.log` in Notepad. You should see Uvicorn starting up and eventually `INFO: Application startup complete.` and `Uvicorn running on http://127.0.0.1:...`.
- **BottomBar Telemetry:** Look at the bottom center of the app.
    - Does it say `Worker Idle`?
    - _Note: If the RAM indicator still says `—` instead of numbers, that is a known missing feature (Frontend Health Polling) and is NOT a failure for Phase 10. Just note it._

## 🖼️ Phase 2: The Core Happy Path (The Money Shot)

This is the main product flow. Drop a file, get Markdown.

- **Prepare Test Image:** Find a clear image with text (e.g., a photo of a document, a screenshot of an article, or a PDF). Keep it under 50MB.
- **The Drop:** Drag and drop the image into the left **Dropzone**.
- **Queue Validation:**
    - The file appears in the **Queue** (bottom left).
    - The status dot turns **Yellow (Spinner)** indicating processing.
- **The Wait (CPU Load):**
    - Open Task Manager.
    - Look at `scan2text-backend.exe`. CPU usage should spike, and Memory should jump to ~1.5 GB - 2 GB as it loads the 969MB AI model into RAM.
- **The Success:**
    - After 10-30 seconds (depending on your CPU), the Queue dot turns **Glossy Green**.
    - The Right Panel (**Preview**) automatically populates with the rendered Markdown.
- **Markdown Quality Check:**
    - Is the text extracted accurately?
- **File Output Check:**
    - Open your designated output folder.
    - Verify a new `.md` file was created.
    - Verify the filename follows the convention: `{original_stem}_{HHmm}_{yyyyMMdd}.md` (e.g., `invoice_1430_20260815.md`).

## 🛡️ Phase 3: Edge Cases & Guardrails

Let's try to break it like a real user would.

- **Batch Cap (10 Files):** Select 12 images on your desktop. Drag and drop all 12 into the Dropzone.
    - **Expected:** Only the first 10 enter the Queue. A warning toast pops up saying max 10 files. The extra 2 are ignored.
- **Invalid File Type:** Drag and drop an `.mp4` video or `.exe` file.
    - **Expected:** It is rejected immediately. A red/error toast appears. It never enters the Queue.
- **The "Missing Model" Simulation (The Ultimate Proof):**
    - Close the app completely.
    - Go to `D:\Scan2Text\models\` and rename `vlm.gguf` to `vlm.gguf.HIDDEN`.
    - Launch `Scan2Text.exe` again.
    - Drop an image.
    - **Expected:** The Queue dot turns **Glossy Red** (Failed).
    - Open `backend-boot.log`. It should explicitly state "Model files not found" or similar, proving the path service is correctly looking in the `models` folder and failing gracefully when it's empty.
    - _Fix it back:_ Rename `vlm.gguf.HIDDEN` back to `vlm.gguf`.

## 🧹 Phase 4: Teardown & Evidence Collection

- **Screenshot the Green Dot:** Take a screenshot of the app with a successfully processed file in the Queue (Green dot) and the Markdown in the Preview panel. (This is your CEO Acceptance artifact).
- **Screenshot the Log:** Take a screenshot of `backend-boot.log` showing the Uvicorn boot sequence.
- **Close App:** Close `Scan2Text.exe`.
- **Verify Process Death:** Open Task Manager. Ensure `scan2text-backend.exe` is **dead**. (Tauri must clean up its child processes on exit. If it stays alive, that's a memory leak/ghost process bug).

## 🏁 Final Verdict

- **PASS:** All core paths work, logs are generated, models are found, UI is stable. Phase 10 is **COMPLETE**.
- **FAIL:** Note the exact step, the UI behavior, and the log contents. We enter **Issue-Mode** and diagnose.