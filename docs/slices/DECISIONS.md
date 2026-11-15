# Scan2Text — Decision Log

Every decision made while designing the Cloud engine, the Document-quality pipeline, and the handoff system. The specs, tickets, and slice documents cite these IDs. If a slice seems to contradict an entry here, the entry wins until the log is updated deliberately.

**How to use this log**

1. Read the slice document. It names the decision IDs it relies on.
2. Look up each ID below for the full reasoning.
3. If a decision must change, update this file first, note the date and the reason, then update every slice document that cites it.

**Date of last update:** 2026-11-15

## Vocabulary

Terms follow `docs/GLOSSARY.md`.

---

## Provider and model

| ID | Decision | Reasoning |
|---|---|---|
| D-01 | The Cloud engine speaks the OpenAI-compatible chat-completions shape only. Provider presets and native request shapes (Anthropic blocks, native PDF upload) are architected for but not built. | One adapter, one request builder, one response parser. OpenAI-compatible covers NVIDIA NIM, OpenAI, OpenRouter, and any private vLLM or LM Studio server. Shipping a second shape before a second provider is tested buys nothing. |
| D-02 | Canonical vocabulary: Provider, Model, Local model files, Engine, Recipe, Profile, Route, Job, Batch, Band, Column segment, Cloud consent. Recorded in `docs/GLOSSARY.md`. | The repository already used "model" for the local GGUF pair and "engine swap" for a different concept. Two meanings for one word corrupts every discussion that follows. |
| D-03 | The local engine stays fixed to Ovis 0.9B. The Cloud Profile is the only extension point. | An arbitrary local GGUF swap means supporting unknown vision projectors, mmproj pairing, and context sizes. No proven demand, real support burden. |
| D-04 | Each Profile carries its own Recipe: prompt, sampling, geometry. | A model that follows a foreign recipe produces worse Markdown. The local recipe (temperature 0.1, one full-page PNG) stays untouched. The Cloud recipe uses NVIDIA's recommended vision sampling (temperature 0.6, top_p 0.95) with thinking disabled. |

## Routing

| ID | Decision | Reasoning |
|---|---|---|
| D-05 | Files over 8 MB route to the Cloud engine. Files up to 8 MB stay on the Local engine. | The owner's rule. The Local engine loses quality on dense documents, and the Cloud engine costs money, so the split protects both ends. |
| D-06 | Routing is decided per file, never per batch. | A batch may contain both small and large files. One active job is processed at a time, so a mixed batch simply yields two queues. |
| D-07 | The 8 MB and 50 MB thresholds live in one backend module and are exposed through the API. The frontend may reject oversized files early for convenience, but never decides the route. | One authority means the UI copy can never contradict the behaviour. The backend enforces both bounds regardless of what the frontend allows. |
| D-08 | The Cloud engine accepts files up to 50 MB. Anything larger is rejected at the dropzone. | Keeps a single upper bound for users while letting the Cloud path handle the documents the Local engine cannot. |
| D-09 | One active job overall. A Cloud job occupies the queue slot exactly like a Local job. | Parallel Cloud work would rewrite the store's single-active-job model, the polling contract, and the Rust task handling — three locked behaviours for an unmeasured latency gain. Revisit if the spike shows the queue idling on network wait. |

## API key and consent

| ID | Decision | Reasoning |
|---|---|---|
| D-10 | The key lives in Windows Credential Manager, written through `advapi32 CredWrite`/`CredRead` via `ctypes`. No new dependency. The DPAPI-protected file variant is the documented fallback if the frozen build misbehaves. | Both are DPAPI-encrypted at user scope. Credential Manager keeps the secret out of the portable app folder (which may be a USB stick or a synced folder) and survives app upgrades. `settings.json` stores only a descriptor: key id and last four characters. |
| D-11 | The key never enters `AppSettings`, `settings.json`, the frontend, `localStorage`, logs, crash dumps, or toasts. | `PUT /api/settings` returns the whole settings object to the frontend. Anything in `AppSettings` is therefore public to the UI. |
| D-12 | Cloud consent appears once per session, at the first Cloud job, in a modal naming provider, model, file count, total size, region, and the fact that the provider logs traffic under its own terms. The modal offers Send, Cancel, and a checkbox "use CPU for this batch instead". Confirmed by T01: the hosted provider's trial terms state that input and output are recorded. | Consent that does not name the recipient and the data is not consent. The checkbox is the escape hatch that keeps a keyless or privacy-sensitive user unblocked. |
| D-13 | A file over 8 MB with no key configured is blocked with one toast offering "add an API key" or "process on CPU anyway". The CPU override lasts for the batch. | The user is never dead-ended by a missing key, and the no-CPU rule stays the default. |
| D-14 | The Settings panel has a "Cloud engine" toggle, off by default, separate from whether a key exists. Turning it off disables Cloud routing without deleting the key; a separate action deletes the key. | A saved key must never silently enable a feature that sends documents to a third party. The toggle is also the rollback lever. |

## Cloud execution

| ID | Decision | Reasoning |
|---|---|---|
| D-15 | **Amended 2026-11-15 on T01 evidence.** A Band is five consecutive 150 DPI full pages sent in one request. A table is never sent as a band of 300 DPI crops: a table of twelve or fewer columns is transcribed from the page image inside the page band, and a table of thirteen or more columns is reconstructed from text geometry with no model request (D-27). The band size remains a Profile setting. | A five-crop band of 300 DPI table images measured 53 to 79 seconds against a 20-second limit, because the model retypes every cell. Five 150 DPI pages measured 12.7 to 14.1 seconds and pass. |
| D-16 | The provider request sends page images and the extracted text layer together. | Both carry the same content, so withholding the text buys no privacy and costs fidelity. The consent dialog names both. |
| D-17 | The Cloud prompt asks for HTML tables, and the existing HTML-to-GFM converter produces the final Markdown. The prompt never asks for bounding-box image tags. | The converter is already tested for merged cells, ragged rows, and malformed HTML. Embedded images are extracted from the PDF directly, so no model-emitted coordinates are trusted. |
| D-18 | The prompt is a versioned asset inside the Profile, and the version is recorded in the output front matter. | A result must be traceable to the prompt that produced it. |
| D-19 | A provider connection test proves capability, not reachability: it sends one small image plus text, then reports model id, vision capability, latency, and a per-document cost estimate. | A text-only model must be rejected before a job runs, not after the user has paid for pages. |
| D-20 | Failure taxonomy: 401, 403, and quota errors fail fast with a specific message and a "fix key" action; 429, 5xx, and timeouts retry three times with backoff and jitter, then park the job; a dead network parks the job. The engine never changes on its own. | A silent switch to a different engine, recipe, and privacy posture violates the routing promise without telling anyone. Parking beats failing a twenty-minute job over a transient outage. |
| D-21 | Polling becomes status-driven: poll until terminal, with the existing health guard and backoff. One document has a 30-minute ceiling; hitting it parks the job with a retry button. | A fixed poll count cannot tell "slow" from "stuck". The ceiling makes a stuck job visible. |
| D-22 | The user can cancel a running job. The local wait stops, the result is discarded, and the upstream request is aborted best-effort. A toast and the job tooltip state that the provider may still finish and charge. | A thirty-minute job with no cancel is a trap. The cost warning is honest: aborting the connection does not always stop the provider's work. |
| D-23 | The provider client is a seam with a fake implementation. No test touches the network. | One new seam keeps the suite hermetic and lets CI run without any key. |
| D-24 | Per-job cost estimate before sending, and a per-session spend counter. No hard dollar cap in the first release. | The user owns the key and the bill, so the job is visibility, not paternalism. A hard cap can strand a legitimate long job. |
| D-25 | Only OpenAI-compatible shapes are built. Native PDF upload and Anthropic-compatible shapes are deferred, and the capability test reports when a configured model offers them. | Keeps one request builder. The capability report tells the user that a better path exists without building it yet. |

## Document quality

| ID | Decision | Reasoning |
|---|---|---|
| D-26 | The PDF text layer is read with pdfium: words, font sizes, and positions. Headings, lists, links, code, and paragraph order are rebuilt from it without OCR. | A digital PDF currently gets rasterized and read by a 0.9B model. Reading the text layer is exact, free, fast, and offline. It is the single largest quality win in this programme. |
| D-27 | Tables with 13 or more columns are reconstructed from text geometry, not from the model. The model is consulted only for scanned pages, where a wide table is split into column segments, processed separately, and stitched by row index. | At 45 columns a 150 DPI page gives roughly 36 pixels per column. No model reads that reliably, and it invents cells. Geometry is deterministic. |
| D-28 | Table cells are never truncated. Rows are padded to the widest row. Pipes inside cells are escaped. | The existing converter truncated long rows, which silently deletes data in a wide table, and did not escape pipes, which breaks the row. |
| D-29 | Cloud output carries YAML front matter: engine, model, prompt version, page count, generation timestamp. The Preview panel strips it. "Copy Markdown" copies the body without it. | Provenance matters six months later. Front matter is metadata for tools, not content for humans. Output naming, the output folder, and the "Open Folder" behaviour do not change. |
| D-30 | A document sanitizer runs on every result: pipe escaping, duplicate header removal, de-hyphenation, whitespace normalisation, and a structural validator that flags unbalanced tables and empty pages. | The Cloud model will occasionally emit a malformed table. A validator catches it before the user opens the file. |

## User interface

| ID | Decision | Reasoning |
|---|---|---|
| D-31 | Cloud profiles live in a new "Cloud engine" section of the existing Settings dialog: profile list, base URL, model id, key, test connection, enable toggle. No new shell surfaces. | One settings home. The TopBar stays icon-only and the Command Center shell is untouched. |
| D-32 | A Cloud job shows a small cloud icon in the queue row, icon-only, with a tooltip naming the engine and model. The status dot keeps status meanings only. | Overloading the dot's colour with engine information breaks the locked palette semantics. One extra 14-pixel icon costs the row nothing. |
| D-33 | One new waiting colour: warm amber-brown `#B45309`, matte. The reason (network, quota, needs action) lives in the tooltip, in both locales. | The owner chose a new colour over reusing grey. Two colours would make the 14-pixel slot harder to read. The token joins the palette lock test and the palette section of `AGENTS.md` when the feature lands. |
| D-34 | One new status value, `waiting`, with a reason field, on both the backend and the frontend. The backend also gains specific error codes: rate limited, network unavailable, provider unauthorized. The existing `skipped` mismatch between backend and frontend is fixed at the same time. | One state means one dot case. The reason drives the tooltip and the remedy. |
| D-35 | The Preview header keeps exactly two buttons. Provenance is visible in the queue tooltip and in the Markdown file. | The Preview header is locked to Copy Markdown and Open Folder. A third element is scope creep. |
| D-36 | One aggregated toast per batch states the new limits and the remedy. The welcome expectations screen and all limit copy are rewritten in English and Indonesian. | The existing invalid-batch rule already aggregates. The copy now teaches the routing model instead of hiding it. |

## Verification and release

| ID | Decision | Reasoning |
|---|---|---|
| D-37 | A spike runs first and records real figures: base64 image acceptance on the hosted endpoint, token counts for a 150 DPI page and a 300 DPI table crop at five pages per band, latency, and cost for a 30-page document. | Base64 acceptance is documented for self-hosted NIM containers and unverified for the hosted endpoint. The spike proves it. |
| D-38 | **Amended 2026-11-15 on T01 evidence.** Spike pass thresholds: cost at or below $0.10 per 30-page document (measured $0.019 to $0.034); band latency at or below 20 seconds for a five-page 150 DPI band (measured 12.7 to 14.1 seconds); at least 98% table-cell accuracy for model-transcribed tables of twelve or fewer columns (measured 100%, 1890 of 1890 cells) and for geometry-reconstructed tables of thirteen or more columns; a direct 45-column model request is excluded from the gate; zero malformed tables (measured 0 of 17); zero hallucinated columns (measured 0 of 45). | The measured failure is a legibility limit, not a structural one: at roughly 53 pixels per column the model returned all 45 headers but truncated every cell value. Scoping the gate to the regime where the model is actually used keeps the gate meaningful instead of knowingly impossible. |
| D-39 | Eight tiny synthetic fixtures with golden Markdown files are committed, plus the owner's real documents compared manually but gitignored. | Quality must be measurable and must gate a release. The fixtures stay small and synthetic because the repository deliberately keeps binaries out of the public tree; committing them needs an explicit ignore exception, requested before it is added. |
| D-40 | The Cloud engine ships as an opt-in beta in version 1.2.0, off by default, labelled Beta in Settings. | The hosted provider's production licence question is still open, and a beta label sets the right expectation. |
| D-41 | `pyproject.toml` holds the product version. The backend reports it, the frontend reads the backend's health version, and the current disagreement (0.1.0, 1.0.0, 1.1.0) is resolved. | The health endpoint already reports a version nobody trusts because it is wrong. One number to maintain. |
| D-53 | Continuous integration and delivery is scoped as its own spec, published before the other three, so every ticket lands behind a green gate. The workflow runs the five gates plus the slice-document checker on every pull request and push, with no secret and no API key present. | A gate that does not exist protects nothing. The fake provider means the Cloud tests run in CI without a key, and the checker turns the slice-document template from a convention into a gate. |
| D-56 | The CI runner is windows-latest only. | The application ships on Windows. A Linux runner would need webkit2gtk and a different frontend pipeline, and its green result would say little about the shipped platform. GitHub bills Windows runners at roughly twice the Linux rate. |
| D-57 | CI installs the backend test subset only: pytest, httpx, pytest-asyncio, fastapi, uvicorn, pydantic, python-multipart, pillow, psutil, requests, pypdfium2. `llama-cpp-python` is deliberately excluded, with a comment in the workflow explaining that the suite imports the adapter but never the runtime. | The adapter imports `llama_cpp` lazily inside the worker function, so the suite passes without it. Installing it on Windows means a source build with CMake, which is slow and likely to fail. |
| D-58 | CI builds the frozen artifact and attaches it to a draft GitHub Release. A human publishes it. | Automating the slow build saves the owner a local step, while the human still decides what ships. A tag-triggered automatic publish risks releasing a broken binary to users. |

## Handoff system

| ID | Decision | Reasoning |
|---|---|---|
| D-42 | Slice documents live in `docs/slices/`, committed, public-safe: no internal jargon, no absolute local paths, no secrets. | A document in the private vault cannot hand off to another model or another machine. |
| D-43 | `docs/slices/DECISIONS.md` (this file) holds full reasoning. Each slice document restates the decisions it depends on by ID with a one-line summary. | Duplicating full reasoning in twelve documents guarantees drift. |
| D-44 | Every slice document uses one fixed template with fourteen sections, including "Files to touch", "Files NOT to touch", the exact RED tests, verification commands with expected results, new i18n keys, the Obsidian update, and Handoff notes. | The "Files NOT to touch" section prevents the ghost-edit failures this repository has already suffered. "Handoff notes" makes the next model start warm. |
| D-45 | Every slice document opens with a state snapshot (baseline test counts, last commit, open blockers) that the executing model refreshes at the end. One rolling `docs/slices/STATE.md` is updated after every slice. | A model reads the document first; a human reads the state file first. |
| D-46 | Each slice names its RED tests exactly and the expected count before and after, and lists the five gates: targeted test, full suite, typecheck, build, cargo check. | The Definition of Done already requires a new baseline count per slice. Naming the tests in advance makes "RED confirmed" auditable rather than claimed. |
| D-47 | Each slice carries a five-line house-rules block and points to `AGENTS.md` as the source of truth. `AGENTS.md` is read first. | A model that has never seen `AGENTS.md` still cannot break the rules. `AGENTS.md` still owns them. |
| D-48 | `docs/slices/HANDOFF-GUIDE.md` is the execution contract, and `scripts/check_slice_docs.py` (standard library only, written test-first) fails when a slice document is missing a section, the read-`AGENTS.md` line, the RED test list, or the verification commands. | A template that is only a convention drifts within two slices. A checker makes it mechanical. |
| D-49 | The issue tracker is GitHub Issues on `wparclabs-bit/scan2text` with the `ready-for-agent` label. The tracker holds status and acceptance criteria; the slice document holds execution detail. Both cross-reference by ID. | Public, portable, and impossible to drift, because each artifact holds what it is good at. |
| D-50 | The work is split into three specs: Cloud engine, Document quality, Handoff and operations. | One spec for everything does not fit a fresh context window. Three specs, published in dependency order. |
| D-51 | Twelve tickets, each a vertical tracer bullet. Ticket 1 (the spike) and Ticket 7 (the text layer) have no blockers and can run in parallel. | A horizontal slice list leaves the application with a routing flag and no way to convert a file. |
| D-52 | The definition of done for a handoff: RED confirmed failing, the five gates pass, the new baseline count recorded, `data-testid` and both locale strings present, the Obsidian summary written, the slice snapshot and handoff notes updated, the checker script passes, and the work is committed. Layout-visible changes additionally need a screenshot for manual review. | "Done" must mean the next model can start without asking a question. |

## Open

| ID | Item | Status |
|---|---|---|
| D-54 | The hosted provider's licence for production use, and the privacy wording that depends on it. | Depends on the owner's account and an NVIDIA agreement. The beta ships with the trial terms disclosed. |
| D-55 | Merging the two files numbered ADR-007 in the private vault, and writing ADR-010 (Cloud engine, routing, profiles) and ADR-011 (key storage and consent). | Queued for the Handoff and operations ticket. |
