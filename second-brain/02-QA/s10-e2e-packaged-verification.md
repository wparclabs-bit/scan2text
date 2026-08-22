# S10 — E2E Packaged Verification

> **Author:** Kilo (agent) — CEO executes all steps manually (AGENTS.md 3.8)
> **Date:** 2026-08-14
> **ADR-008:** Production backend binds 127.0.0.1:47351

---

## Prerequisites

- MSI or NSIS installer built from S9.8-FIX baseline.
- A scanned test image (PNG, JPG, or PDF) — anything with readable text.
- PowerShell 5.1+ (built into Windows 10/11).

---

## Step 1 — Install the App

1. **Run the installer** (choose whichever you have):
   - **NSIS:** `Scan2Text-Setup-*.exe` (runs per-user install to AppData)
   - **MSI:** `Scan2Text-*.msi` (runs per-machine install to Program Files)
2. Confirm the installation completes without errors.
3. Check that **Scan2Text** appears in the Windows Start menu.

---

## Step 2 — Run the Health-Check Script

1. Open **PowerShell** as the same user who installed the app.
2. Run the verification script:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\verify-packaged-backend.ps1
   ```

3. **Expected output:**
   - `[FOUND] Scan2Text.exe = ...` (green)
   - `[UP] Port 47351 is OPEN after Xs` (green)
   - `[OK] Health response:` with `status: ok` (green)
   - `[PASS] Backend reports healthy.` (green)

4. **If it fails:**
   - `[FAIL] Scan2Text.exe not found` → Re-install, then retry.
   - Port timeout → Check Windows Firewall; the backend binds 127.0.0.1 only (ADR-008).
   - Health check fails → Check the log file listed in the output.

---

## Step 3 — Launch the UI

1. Open **Scan2Text** from the Start menu (or desktop shortcut).
2. The app should open with:
   - The **Dropzone** panel visible (dashed area with background image).
   - The **Queue** panel on the left (empty).
   - The **Preview** panel on the right (empty).
   - TopBar shows the brand image + theme/language/settings icons.
   - BottomBar shows "Worker Idle" (or similar idle status).

3. **If the app crashes or shows an error**, check the log file from Step 2 for backend startup issues.

---

## Step 4 — Drop a Test Image

1. **Drag and drop** a scanned image (PNG, JPG, PDF, or WEBP) into the **Dropzone** area.
   - File must be under **50 MB**.
   - Recommended: a simple scanned document with clear text.
2. The file should appear in the **Queue** panel with a status indicator.
3. The status should change from **pending** → **processing** (spinner) → **complete** (green dot).

---

## Step 5 — Verify Markdown Output

1. After the status turns **green** (complete), the **Preview** panel should display the extracted Markdown.
2. Verify the Markdown:
   - Contains readable text from the original document.
   - Formatting (headings, lists, paragraphs) is preserved where applicable.
3. Check the **output folder** (the folder shown or referenced in the UI):
   - A `.md` file should exist with naming pattern `{stem}_{HHmm}_{yyyyMMdd}.md`.
   - If a collision occurred, `_2` or `_3` suffixes should be present.
   - The file should **never overwrite** an existing file with the same name.

---

## Step 6 — Verify i18n (Optional)

1. Click the **language toggle** icon in the TopBar.
2. All UI labels should switch between English and Indonesian.
3. No hardcoded strings should appear in any language.

---

## Step 7 — Verify Theme Toggle (Optional)

1. Click the **theme toggle** icon in the TopBar.
2. The app should switch between dark (default) and light themes.
3. Colors should match the Coffee & Paper palette (AGENTS.md §5).

---

## Expected Results Summary

| Step | What to Check | Expected |
|------|---------------|----------|
| 1 | Installer runs | No errors, app in Start menu |
| 2 | Script output | Port 47351 open, health "ok" |
| 3 | UI opens | Three panels visible, no crash |
| 4 | Image processing | Queue shows green dot (complete) |
| 5 | Markdown output | Readable text in Preview + .md file on disk |
| 6 | i18n | English ↔ Indonesian toggle works |
| 7 | Theme | Dark ↔ Light toggle works |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Script says "not found" | Installer didn't place exe in expected path | Check `AppData\Local\Scan2Text\` or `Program Files\Scan2Text\` |
| Port timeout after 30s | Backend failed to start | Check the log file; look for Python errors |
| UI opens but no Queue/Preview | Frontend build issue | Verify `npm run build` succeeded |
| Image queued but never completes | Backend OCR failure | Check log; ensure model file is bundled |
| Markdown output is empty | OCR model or prompt issue | Verify model is the Ovis engine per ADR-006 |
| Health returns non-"ok" | Backend started but unhealthy | Check log for model loading errors |

---

## Pass Criteria

All 7 steps produce expected results **and** the CEO confirms via screenshot of the running app with a processed image showing readable Markdown output.
