# Slice 8.4 — Feedback Button (GForm + Offline Queue)

Date: 2026-08-11
Phase: Phase 7
Parent ADR: ADR-007 Decision 1
FR: FR-16
NFR: NFR-02 (no silent auto-upload)

## What Changed

### Backend
- New `src/scan2text/services/feedback_service.py` with `FeedbackService`:
  - `save_pending_feedback(message, contact)` → saves timestamped JSON to `feedback/pending/{timestamp}.json`
  - `get_pending_count()` → counts `.json` files in `feedback/pending/`
  - `move_pending_to_sent(filename)` → moves file from `pending/` to `sent/`
- New `src/scan2text/routes/feedback.py` with three endpoints:
  - `POST /api/feedback` — accepts `{message, contact?}`, returns `{filename}`
  - `GET /api/feedback/pending-count` — returns `{count: int}`
  - `POST /api/feedback/mark-sent` — accepts `{filename}`, returns `{moved: bool}`
- Route registered in `src/scan2text/api/main.py`

### Frontend
- New `src/components/layout/FeedbackButton.tsx` — icon-only button (MessageSquare lucide icon) with tooltip
  - Online: `window.open(FEEDBACK_FORM_URL, '_blank')`
  - Offline: calls `onOfflineOpen` callback
  - `FEEDBACK_FORM_URL = "https://placeholder.local/feedback"` (constant placeholder)
- New `src/components/layout/FeedbackDialog.tsx` — shadcn Dialog with:
  - Required textarea (min 10 chars)
  - Optional email input for contact
  - Submit calls `POST /api/feedback`
  - On success: closes dialog + shows success toast
- Wired into `BottomStatusBar.tsx` RIGHT zone immediately LEFT of Share button
- `App.tsx` launch-time check: on mount, if online + pending count > 0, shows sonner toast with action button "Send now" that opens form URL
- i18n keys added to `en.json` and `id.json` under `feedback.*`
- Test setup updated with feedback i18n keys

## Key Decisions

1. **No silent auto-upload** — user must explicitly click the action button in the toast (NFR-02)
2. **Placeholder URL** — `FEEDBACK_FORM_URL` is a constant until CEO provides real Google Form URL
3. **Timestamp format** — uses microseconds (`%Y%m%dT%H%M%S%fZ`) to avoid collision when multiple saves happen in same second
4. **Button position** — BottomBar RIGHT zone, immediately left of Share (CEO locked decision)
5. **Offline behavior** — in-app dialog, not browser fallback

## Test Coverage

### Backend (+11 tests)
- `tests/unit/services/test_feedback_service.py`: 8 tests
  - save_pending_creates_file, json_structure_has_required_fields, contact_can_be_none, returns_filename_string
  - returns_zero_when_no_files, returns_correct_count
  - moves_file_from_pending_to_sent, returns_false_for_missing_file
- `tests/test_api_feedback.py`: 3 tests
  - post_feedback_creates_file, get_pending_count, mark_sent_moves_file

### Frontend (+12 tests)
- `src/components/layout/FeedbackDialog.test.tsx`: 6 tests
  - renders_textarea_and_contact_input, submit_button_present, calls_POST_with_correct_payload, calls_POST_without_contact, closes_on_API_success, does_not_render_when_closed
- `src/components/layout/FeedbackButton.test.tsx`: 3 tests
  - renders_icon_with_tooltip, opens_browser_when_online, calls_onOfflineOpen_when_offline
- `src/App.test.tsx`: 2 new tests
  - shows_pending_toast_when_online_and_pending_exist, does_not_show_pending_toast_when_offline
- `src/components/layout/BottomStatusBar.test.tsx`: 1 new test
  - feedback_button_present_in_right_zone

## Open Questions

- None. FEEDBACK_FORM_URL placeholder will be swapped by CEO when real Google Form URL is available.

## Verification

- Backend: 166 tests passing (146 baseline + 20 new)
- Frontend: 583 tests passing (571 baseline + 12 new)
- Typecheck: PASS
- Build: PASS
- No new dependencies added
