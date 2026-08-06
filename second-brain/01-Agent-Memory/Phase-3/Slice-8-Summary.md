All done. Here's what was implemented:

**`tests/test_api.py`** — 5 tests covering the 3 requirements:

- `POST /process` returns `202` with a `task_id`
- `GET /status` returns `{"status", "processed", "total"}`
- CORS allows `localhost:5173` origins (both regular and preflight)

**`src/scan2text/api/main.py`** — FastAPI app with:

- `lifespan` hook that initializes `VlmOcrAdapter` + `QueueService`
- `POST /process` — accepts `{"file_paths": [...]}`, triggers `queue_service.process_image_paths()`, returns `202` with `task_id`
- `GET /status` — returns queue progress state
- `CORSMiddleware` with `allow_origins=["*"]`

**Results:** `96 passed` (5 new API tests + 91 existing). No regressions.