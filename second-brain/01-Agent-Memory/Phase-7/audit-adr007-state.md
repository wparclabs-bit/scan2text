# ADR-007 Audit Report
Date: 2026-08-11

## File Existence
| Slice | File | Status |
|-------|------|--------|
| S3 | src/scan2text/services/postprocess_service.py | EXISTS |
| S3 | convert_html_tables_to_gfm function | EXISTS (line 202) |
| S3 | extract_and_save_image_crops function | EXISTS (line 241) |
| 8.2 | frontend/src/components/layout/WelcomeModal.tsx | EXISTS |
| 8.2 | frontend/src/components/layout/WelcomeModal.test.tsx | EXISTS |
| 8.2 | src/scan2text/models/settings.py hide_welcome_notice field | EXISTS (line 14) |
| 8.2 | frontend/src/locales/en.json welcome keys | EXISTS (lines 86-89) |
| 8.2 | frontend/src/locales/id.json welcome keys | EXISTS (lines 86-88) |
| 8.3 | src/scan2text/utils/cpu_budget.py | EXISTS |
| 8.3 | calculate_auto_threads function | EXISTS (line 13) |
| 8.3 | vlm_ocr.py auto thread calculation | EXISTS (import line 24, usage line 162) |
| 8.4 | src/scan2text/services/feedback_service.py | EXISTS |
| 8.4 | src/scan2text/routes/feedback.py | EXISTS |
| 8.4 | frontend/src/components/layout/FeedbackButton.tsx | EXISTS |
| 8.4 | frontend/src/components/layout/FeedbackDialog.tsx | EXISTS |
| 8.4 | BottomStatusBar.tsx FeedbackButton import | EXISTS (line 6) |
| 8.5 | src/scan2text/services/logging_service.py | EXISTS |
| 8.5 | RotatingFileHandler | EXISTS (import line 4, usage line 19) |
| 8.5 | PrivacyFilter class | **MISSING** |

## Test Results
- Backend: **ERROR** — 1 error during collection (tests/unit/services/test_logging_service.py imports PrivacyFilter which does not exist in logging_service.py)
- Frontend: 583 passed, 0 failed
- Typecheck: PASS
- Build: PASS

## Git History
```
197ebff feat(8.3): CPU budget auto-calculation per ADR-007 Decision 2
195d2e5 feat(welcome): add first-run expectations screen per ADR-007
cc09265 S3: Matrix HTML parser + crop guardrails
0b58701 slice 8.2: lock ADR-007 feedback/cpu/welcome/distribution/log-privacy docs
9f888ad slice 8.1: lock ADR-007 feedback/cpu/gdrive docs
cc43f73 Phase 7 complete: OvisOCR2 engine swap, GFM converter, cleanup
73b3ba1 docs(S2): add TDD enforcement lesson to Phase 7 + update test counts
23b53d5 slice S4: live fire integration test passed
d703d55 slice S3: post-process service for GFM tables and chart crops
1fafc6b slice S2: port adapter to OvisOCR2 recipe (ADR-006)
f055c4f fix(ocr): worker is daemon so host process exits cleanly (no shutdown hang)
9cad343 feat(ocr): auto-scale tiling — wide images split into focused ~1150px views (NFR-04)
bd1caa3 tune(ocr): raise generation budget to 4096 tokens for wide tables (NFR-04)
818ab54 tune(ocr): raise vision resolution to 2048 / scale 2.0 for table accuracy (NFR-04)
021a29e fix(ocr): cap image resolution, n_ctx 8192, timeout 600, worker survives bad tasks (NFR-05)
```

## Verdict
| Slice | Status | Notes |
|-------|--------|-------|
| S3 (Post-processor) | **COMPLETE** | Both functions present, committed in cc09265 |
| 8.2 (Welcome Screen) | **COMPLETE** | All files, settings field, i18n keys present |
| 8.3 (CPU Budget) | **COMPLETE** | cpu_budget.py + vlm_ocr.py wiring present |
| 8.4 (Feedback Button) | **COMPLETE** | All backend + frontend files present, wired into BottomStatusBar |
| 8.5 (Log Privacy) | **PARTIAL** | RotatingFileHandler exists but PrivacyFilter class is MISSING — test collection fails |

## Summary
Four of five ADR-007 slices are COMPLETE. Slice 8.5 (Log Privacy) is PARTIAL: the logging_service.py file exists with RotatingFileHandler and size-based rotation (1 MB, 5 backups), but the `PrivacyFilter` class that strips file paths from log output has not been implemented. The test file `tests/unit/services/test_logging_service.py` imports `PrivacyFilter` and fails at collection time. This is a blocking issue for backend test green status.
