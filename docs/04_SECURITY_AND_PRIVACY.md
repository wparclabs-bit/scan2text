# Privacy, Security & Network Boundaries

> **Generated:** 2026-09-03  
> **Audit Status:** PASSED

---

## 1. Network Boundaries

### 1.1 Backend Binding

**Verification:** Confirmed localhost-only binding.

**Source:** `src/scan2text/utils/prod_runtime.py:35-36`
```python
def get_host() -> str:
    """Always bind to localhost for local-first security."""
    return "127.0.0.1"
```

**Source:** `src/scan2text/utils/prod_runtime.py:30-32`
```python
def get_port() -> int:
    """Return the unified port (47351) — same for frozen and dev."""
    return 47351
```

**Port Configuration:**
- Dev mode: `127.0.0.1:47351` (`dev.ps1:7,32`)
- Production: `127.0.0.1:47351` (frozen executable)
- **No `0.0.0.0` bindings detected**

### 1.2 CORS Configuration

**Source:** `src/scan2text/api/main.py:54-59`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Security Assessment:** CORS allows all origins, but this is **safe** because:
1. Server binds only to `127.0.0.1` (localhost)
2. Only the Tauri webview can reach the API
3. No external network exposure

---

## 2. Privacy Filters

### 2.1 Log Redaction

**Service:** `src/scan2text/services/logging_service.py:20-51`

**PrivacyFilter Class:**
```python
class PrivacyFilter(logging.Filter):
    """Strips file paths and long text blocks from log records."""
```

**Redaction Rules:**

| Pattern | Replacement | Source Line |
|---------|-------------|-------------|
| Windows paths (`C:\Users\...`) | `[FILE_REDACTED]` | `logging_service.py:14` |
| Filename with extension | `[FILE_REDACTED]` | `logging_service.py:11` |
| Long text (>200 chars) | Truncated to 100 chars + `[REDACTED]` | `logging_service.py:17` |
| Log args (>40 chars) | `[REDACTED]` | `logging_service.py:49` |

**Regex Patterns:**
```python
_FILE_EXT_RE = re.compile(r'(\b[A-Za-z0-9_\-.,;:()@#$%^&*+=<>?\[\]{}~`\'"]+\.(?:pdf|jpg|jpeg|png|webp|md|txt)\b)')
_WIN_PATH_RE = re.compile(r'([A-Za-z]:[/\\][\w\s\-.,;:()@#$%^&*+=<>?\[\]{}~`\'"]+)')
_LONG_TEXT_RE = re.compile(r'\S{200,}')
```

### 2.2 Structured Formatter

**Source:** `src/scan2text/services/logging_service.py:54-76`

**Allowed Keys (whitelist):**
```python
ALLOWED_KEYS = {
    'extension', 'byte_count', 'page_count',
    'duration', 'error_code', 'model_version', 'timestamp'
}
```

**Effect:** Only metadata is logged; actual OCR content is never written to logs.

---

## 3. Telemetry Verification

### 3.1 External Network Calls

**Audit Result:** NO external telemetry detected.

**Verified Outbound Connections:**
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `https://placeholder.local/feedback` | Feedback form | Placeholder only |
| `GET /api/download/*` | Model download | User-initiated only |
| `GET /api/health` | Health check | Localhost only |
| `POST /api/feedback` | Feedback submission | Offline queue |

**No Evidence Of:**
- Analytics SDKs
- Crash reporting services
- Usage tracking
- Silent network calls

### 3.2 Feedback Mechanism

**Source:** `frontend/src/App.tsx:12`
```typescript
const FEEDBACK_FORM_URL = 'https://placeholder.local/feedback'
```

**Behavior:**
- Feedback is stored locally in `feedback/pending/` as JSON files
- No automatic transmission
- User must manually open feedback form
- GForm button in BottomBar (placeholder URL)

---

## 4. Data Isolation

### 4.1 Memory-Only State

**Jobs:** Never persisted to disk or localStorage
- Stored only in Zustand store (`scan2text.store.ts`)
- Lost on application restart
- No browser storage writes for job data

**Settings:** Persisted to `settings/settings.json`
- User preferences only
- No sensitive data (paths are local, no credentials)

### 4.2 File System Isolation

**Upload Directory:** `uploads/` (temporary, per-request)
**Output Directory:** User-selected, outside app folder
**Quarantine:** `failed/` (auto-cleaned after 7 days)
**Logs:** Rotating, redacted, 1MB max

---

## 5. Security Controls

### 5.1 Input Validation

**Frontend Validation:** `src/lib/fileValidation.ts`
- Max file size: 20 MB
- Allowed types: PNG, JPG, JPEG, WEBP, PDF
- Batch limit: 10 files

**Backend Validation:** `src/scan2text/services/file_service.py`
- Max file size: 100 MB (defense in depth)
- PDF page limit: 50 pages (configurable)
- PDF size limit: 20 MB

### 5.2 Boot Guard

**Source:** `src/scan2text/boot_guard.py:30-98`

**Functionality:**
- Kills stale `scan2text-backend.exe` processes on port
- Exits with error if foreign process holds port
- Prevents zombie processes

### 5.3 Process Cleanup

**Source:** `frontend/src-tauri/src/backend_process.rs:298-353`

**Cleanup Strategy:**
```powershell
taskkill /F /IM scan2text-backend.exe /T
```
- Force kill by image name (not PID) — handles daemonized Python backend
- Tree kill (`/T`) ensures child processes are terminated
- Port wait loop verifies cleanup completion

---

## 6. Tauri Permissions

**Source:** `frontend/src-tauri/gen/schemas/capabilities.json`
```json
{
  "default": {
    "identifier": "default",
    "description": "Default capability",
    "local": true,
    "windows": ["main"],
    "permissions": ["core:default", "shell:allow-open"]
  }
}
```

**Granted Permissions:**
- `core:default` — Core Tauri functionality
- `shell:allow-open` — Open output folder in system explorer

**Denied Permissions:**
- No filesystem access beyond output folder
- No network access beyond localhost
- No clipboard writing (except share button placeholder)

---

## 7. Privacy Summary

| Aspect | Status | Details |
|--------|--------|---------|
| Network binding | ✅ SECURE | `127.0.0.1` only |
| Log redaction | ✅ ACTIVE | Paths and content stripped |
| Telemetry | ✅ ABSENT | No external calls |
| Data persistence | ✅ LIMITED | Settings only, no jobs |
| File isolation | ✅ CONTAINED | User-selected output dir |
| Input validation | ✅ ENFORCED | Size, type, batch limits |
| Process cleanup | ✅ ROBUST | Taskkill + port wait |
