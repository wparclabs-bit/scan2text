Good. That clarifies the Phase 6 direction.

My CTO take: **yes, frontend-first prototype is the right move** for now.

**What:** We make the frontend feel real, safe, and testable before we depend heavily on the backend.

**Why:** Real-person testing is about validating the product experience: Can someone understand it? Can they add a file? Can they see progress? Can they get the Markdown out? If the frontend flow is solid, the backend only needs to implement a small, clear contract.

But we should not just “polish randomly.” We should build a **clickable, believable prototype** with a controlled demo/mock mode, then later swap in the real backend.

---

## My recommended Phase 6 strategy

### Phase 6 goal

Build a **real-person testable prototype** of Scan2Text.

The prototype should let a person:

1. Open the app.
2. Drop/select an image or PDF.
3. See the file enter the queue.
4. See progress.
5. See success or failure.
6. Preview Markdown.
7. Copy or download the Markdown.
8. Retry/remove failed jobs.
9. Understand what happened without needing developer knowledge.

That is enough for a useful user test.

---

## Important frontend cases vs edge cases

### High-priority cases

These are the main things real users will do.

1. Add a valid image.
2. Add a valid PDF.
3. See upload/processing progress.
4. See completed Markdown preview.
5. See failed state and retry.
6. Remove a job.
7. Copy Markdown.
8. Download Markdown as `.md`.
9. Invalid file type error.
10. File too large error.
11. Empty state.
12. Dark/light theme persistence.
13. Language persistence.

### Edge cases

These matter, but we should not let them block the prototype.

1. User drops many files at once.
2. User drops unsupported file extension but valid MIME type.
3. User drops valid extension but weird MIME type.
4. Very long file name.
5. Very large Markdown output.
6. Markdown contains tables, lists, links, code blocks.
7. Browser language is `en-US`, `id-ID`, or unknown.
8. User removes job while progress timer is running.
9. User retries a failed job multiple times.
10. PDF backend pipeline is not ready.
11. Backend goes offline mid-job.
12. Object URLs need cleanup.

For the prototype, I recommend we handle the edge cases that cause confusing UX, but we do not need to solve every backend-related edge case yet.

---

## Commands to check current frontend health

Run these in PowerShell inside the project.

### 1. Go to the project folder

powershell

1

**What:** Moves PowerShell into the Scan2Text repo.

**Why:** Commands like `npm run test` need to run from the correct project folder.

---

### 2. Run frontend tests

powershell

1

**What:** Runs Vitest.

**Why:** Confirms we still have the 320-test baseline.

---

### 3. Run TypeScript check

powershell

1

**What:** Checks TypeScript types.

**Why:** Prevents hidden type bugs before we add more features.

---

### 4. Run production build

powershell

1

**What:** Builds the frontend.

**Why:** Confirms the app can be packaged without errors.

---

### 5. Start local dev server

powershell

1

**What:** Starts Vite locally.

**Why:** You can manually click through the prototype and test UX.

---

## Commands to check whether backend/API/model is available

These are exploratory commands because I do not yet know exactly where your backend code lives.

### 1. Check repo contents

powershell

1

**What:** Lists files in the project root.

**Why:** Helps us see whether backend code is inside this repo or somewhere else.

---

### 2. Search for Python backend files

powershell

1

**What:** Searches for Python backend files.

**Why:** The backend is likely Python because of `llama-cpp-python`.

---

### 3. Check if port 8000 is active

powershell

1

**What:** Checks whether something is listening on port 8000.

**Why:** Many FastAPI/Uvicorn backends run on port 8000.

If nothing appears, the backend is probably not running.

---

### 4. Check backend health endpoint

If your backend is expected to run on `http://127.0.0.1:8000`, run:

powershell

1

**What:** Calls the backend health endpoint.

**Why:** Tells us whether the backend is alive.

Expected good result:

json

1

or something similar.

---

### 5. Check API docs

powershell

1

**What:** Opens FastAPI docs in the browser if the backend uses FastAPI.

**Why:** Lets us visually confirm endpoints like `/upload`, `/status/{task_id}`, `/result/{task_id}`, `/health`.

If the page does not open, the backend may not be running or may not be FastAPI.

---

### 6. Check Python version

powershell

1

or:

powershell

1

**What:** Checks Python installation.

**Why:** Needed to run the local OCR backend.

---

### 7. Check whether llama-cpp-python is installed

powershell

1

If that fails, try:

powershell

1

**What:** Checks whether `llama-cpp-python` is available.

**Why:** The OCR model is supposed to run through `llama-cpp-python`.

---

### 8. Test upload endpoint manually

Only run this after we know the backend is running and the endpoint path is correct.

Example:

powershell

1

**What:** Sends a test file to the backend.

**Why:** Confirms whether the upload pipeline works outside the frontend.

Replace `D:\path\to\sample.png` with a real image path.

---

## Risk test checklist

Yes, the risks can be tested. But we should test them one by one.

|Risk|How to test|Pass condition|
|---|---|---|
|Frontend baseline broken|`npm run test`, `npm run typecheck`, `npm run build`|All green|
|UI confusing for real users|Manual prototype test|User can complete upload-to-result flow|
|Invalid file handling unclear|Drop `.txt`, `.exe`, huge file|Clear toast error|
|Progress feels fake/broken|Watch queue progress|Progress moves and completes/fails cleanly|
|Markdown cannot be exported|Click copy/download|User gets Markdown out|
|PDF pipeline unknown|Test PDF via CLI/backend|Backend returns Markdown or clear error|
|Model not live|Run backend/model CLI check|Backend can answer health/status/result|
|Job cleanup broken|Remove job during progress|No timer leak, no crash|
|Preferences broken|Change theme/language, refresh|Theme/language persist|
|Backend offline|Stop backend, start job|UI shows understandable failure|

---

## My proposed Phase 6 scope

For a real-person prototype, I recommend this order:

### 1. Demo/Prototype mode

**What:** Create a controlled mock OCR flow that returns realistic Markdown after a realistic delay.

**Why:** You can test with real users even before the backend is fully ready.

This should be behind a clean interface so the real backend can replace it later.

---

### 2. Export Markdown

**What:** Add copy and download buttons for completed Markdown.

**Why:** OCR output is only useful if the user can take it somewhere.

This is critical for the prototype.

---

### 3. Better queue actions

**What:** Make remove, retry, clear completed, and selected-job behavior very clear.

**Why:** Real users will make mistakes. They need a safe way to recover.

---

### 4. Better status and error states

**What:** Improve empty state, loading state, failed state, and bottom status bar.

**Why:** Users should never wonder, “Is it stuck? Is it done? Did I break it?”

---

### 5. PDF decision

**What:** Decide whether PDF is enabled in the prototype or shown as “coming soon.”

**Why:** PDF is one of the biggest technical risks. If it fails during a real-user test, it may damage the perceived product.

My recommendation: keep PDF visible in validation only if we have a believable demo path for it. Otherwise, mark it clearly as not ready.

---

## I need 3 more answers before we slice

### 1. Should the prototype use Demo Mode only, or Demo Mode plus optional real backend?

**What:** Do you want the prototype to always use fake/mock OCR results, or should it also be able to connect to a live backend if available?

**Why:** Demo-only is faster and safer for UX testing. Optional real backend is more complete but adds integration risk.

My recommendation: **Demo Mode first, with a clean path to real backend later.**

---

### 2. Should PDF be included in the real-person prototype?

**What:** Should users be able to test PDF now, or should we limit the prototype to images?

**Why:** PDF is risky because we have not verified the backend pipeline. If PDF is important for your test users, we need to handle it carefully. If not, we can reduce scope.

My recommendation: if real users mainly care about documents, we need PDF soon. If they mainly care about images, defer PDF to Phase 7.

---

### 3. What exact action should a test user be able to finish with?

Choose one primary success action:

- A. Copy Markdown to clipboard.
- B. Download `.md` file.
- C. Both copy and download.

**What:** Defines the prototype’s “value moment.”

**Why:** If we do not know the user’s final goal, the prototype may feel incomplete.

My recommendation: **both copy and download**, because different users prefer different things.

---

Answer those three and then say **GO** when you want me to create the first Phase 6 Kilo prompt.