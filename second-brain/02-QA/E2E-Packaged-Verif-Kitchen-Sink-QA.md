# Phase 10: E2E Packaged Verification — Kitchen Sink QA

**Date:** 2026-08-17
**Tester:** CEO
**Target Environment:** `D:\Scan2Text\Scan2Text.exe` (Portable Build, NOT dev server)
**Phase:** 10 (Closure-Pending)

## Instructions
1. Launch `D:\Scan2Text\Scan2Text.exe`.
2. Do NOT run this in the VS Code dev environment. We are testing the PyInstaller/Tauri artifacts.
3. Mark each item `[x]` for Pass or `[ ]` for Fail.
4. If Fail, write exactly what you saw in the `Notes` column.
5. Keep a running list of the "Undisclosed Bugs" at the bottom.

---

## Section 1: Boot & Environment (The Foundation)
- [x] **1.1 No Console Window:** Double-click `Scan2Text.exe`. A black terminal/command prompt window MUST NOT appear. Only the UI shell should open.
- [x] **1.2 First-Run Gate (Models Present):** If `D:\Scan2Text\models\` contains `vlm.gguf` and `mmproj.gguf`, the app should boot straight to the Command Center. NO downloader modal should appear.
- [ ] **1.3 First-Run Gate (Models Missing):** *Optional Destructive Test.* Rename the `models/` folder to `models_backup/`. Relaunch. The downloader modal MUST appear. (Restore folder after). (but button cannot be press(screenshot attached))
- [x] **1.4 Welcome Notice:** The "Welcome to Scan2Text" expectations screen appears (unless previously dismissed). Clicking "Don't show again" and closing/reopening should hide it.
- [x] **1.5 Settings Creation:** Check `D:\Scan2Text\settings\settings.json`. It should exist and contain default values (output_dir, cpu_threads, etc.). ( no the correct folder is "D:\Scan2Text\dist\scan2text-backend\settings\settings.json" )

## Section 2: UI Shell & Layout (Command Center v1.7/1.8)
- [x] **2.1 Viewport Lock:** Resize the window to be very short (squashed vertically). The shell MUST NOT page-scroll. The BottomBar must remain pinned and visible at all times.
- [x] **2.2 TopBar (34px):** 
    - Left: Logo chip + DEMO badge present.
    - Center: Brand image (`text.png`) present with a subtle static glow. No literal "Scan2Text" text.
    - Right: Theme, Language, Settings icons present with tooltips.
- [x] **2.3 BottomBar Telemetry:** 
    - Center: Shows "Worker Idle" (or Busy), RAM %, CPU %, and Version. (RAM and CPU must be actual numbers, NOT "—").
    - Right: Share icon present. Clicking it shows a soft toast ("Sharing coming soon") and does NOT open a browser.
- [x] **2.4 Dropzone:** Dashed area, background image at 15% opacity. Footer reads "max 10 files per batch". No internal scrollbar in the Dropzone.
- [x] **2.5 Queue Empty State:** Shows the localized empty state message (e.g., "📭 Nothing here yet...").

## Section 3: The Happy Path (Core OCR Flow)
*Prep: Have 3 small, valid images (PNG/JPG/WEBP) ready.*
- [x] **3.1 Drag & Drop:** Drop the 3 images into the Dropzone. They immediately appear in the Queue.
- [x] 3.1.1 Cannot Drag and Drop need to click DropZone to open folders
- [x] **3.2 Status Dots (Processing):** The first file shows a yellow spinner. The others show grey dots (pending).
- [x] **3.3 Status Dots (Completion):** As they finish, dots turn glossy green. 
- [x] **3.4 Queue Promotion:** When file #1 finishes, file #2 MUST automatically start processing (yellow spinner) without manual intervention.
- [x] **3.5 Auto-Select Preview:** When a file completes, the Right Panel automatically updates to show the rendered Markdown.
- [x] 3.5.1 But cannot change to other files that is already finished too, for a preview, only the last one shown 
- [x] **3.6 Markdown Output:** Check the Right Panel. Tables and lists should render cleanly. No raw HTML tags visible.
- [x] **3.7 Output Directory:** Check `D:\Scan2Text\output\`. The 3 `.md` files must be there.
- [x] **3.8 Naming Convention:** Files must be named `{original_stem}_{HHmm}_{yyyyMMdd}.md`.
- [x] **3.9 Header Actions:** Click "Copy Markdown" (copies to clipboard). Click "Open Folder" (opens Windows Explorer to the output dir). Both buttons are borderless with caramel hover.
- [x] 3.9.1 Open folder still show Demo Tooltip 

## Section 4: Destructive Guardrails (Breaking the App)
- [x] **4.1 Batch Cap (11 files):** Select 12 small images and drop them. 
    - EXPECTED: Only 10 enter the queue. A warning toast appears ("Max 10 files..."). The 11th and 12th are ignored. 
- [x] **4.2 File Size Guardrail (51MB):** Drop a dummy file larger than 50MB. 
    - EXPECTED: Rejected immediately with an error toast. Never enters the queue.
- [x] **4.3 File Type Guardrail:** Drop a `.txt` or `.exe` file. 
    - EXPECTED: Rejected with an "unsupported type" toast.
- [x] **4.4 PDF Inspector (FILE_TOO_COMPLEX):** Drop a massive 230-page PDF (or >20MB PDF). 
    - EXPECTED: Rejected with `FILE_TOO_COMPLEX` error toast. It MUST NOT crash the backend or hang the UI.
- [x] **4.5 RGBA / Transparent PNGs:** Drop a PNG with transparency (RGBA/LA mode). 
    - EXPECTED: Processes successfully without the "cannot write mode X as JPEG" backend crash (FIX22 verification).
- [x] **4.6 Failure Propagation:** Force a failure (e.g., drop a corrupted/0-byte JPG). 
    - EXPECTED: Status turns glossy red. Tooltip shows error. Remaining valid files in the queue CONTINUE processing. The app does not freeze.
- [x] **4.7 Retry Button:** Click the retry button on the failed red-dot job. It should re-queue and attempt processing again.

## Section 5: i18n & Theme
- [x] **5.1 Theme Toggle:** Click the sun/moon icon in TopBar. UI instantly flips between Dark (coffee/paper) and Light themes. No unthemed white/black boxes.
- [x] **5.2 Language Toggle:** Switch to Indonesian (ID). Queue empty state, toasts, and tooltips MUST translate. The center brand image alt-text remains "Scan2Text".
- [x] **5.3 Persistence:** Close the app and reopen. Theme and Language choices must be remembered.
- [x] 5.4 Dark mode and Light Mode Tooltip, should be switched
- [x] 5.5 Setting cannot be use ? change setting not remembered , when reopen
- [x] 5.6 remove all demo. Bottom Bar 

---

## Section 6: The Undisclosed Bug Hunt (CEO's Hidden List)
*Use this space to dump the bugs you've been holding onto. Be specific: What did you click? What did you expect? What actually happened?*

**Bug 1:** 
- **Action:** 
- **Expected:** 
- **Actual:** 

**Bug 2:** 
- **Action:** 
- **Expected:** 
- **Actual:** 

**Bug 3:** 
- **Action:** 
- **Expected:** 
- **Actual:** 

*(Add more as needed)*