# Data Flows & Execution Pipelines

> **Generated:** 2026-09-03

---

## 1. OCR Execution Pipeline

### 1.1 Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend as React Frontend
    participant Backend as Python Backend
    participant VLM as VLM OCR Adapter
    participant Worker as Llama CPP Worker
    participant Output as Output Service

    User->>Frontend: Drop files onto DropZone
    Frontend->>Frontend: validateFilesBatch()
    alt Invalid files
        Frontend->>User: Aggregated toast warning
    else Valid files
        Frontend->>Frontend: addJob() to Zustand store
        Frontend->>Backend: POST /process (multipart/form-data)
        Backend->>Backend: _save_uploaded_file() → uploads/
        Backend->>Backend: Create task_id, _task_store entry
        Backend-->>Frontend: 202 {task_id}
        Frontend->>Frontend: pollJob() → GET /status/{task_id}
        
        loop Polling (30×1000ms foreground)
            Frontend->>Backend: GET /status/{task_id}
            alt Processing
                Backend-->>Frontend: {status: "processing"}
            else Completed
                Backend-->>Frontend: {status: "completed", result_markdown}
                Frontend->>Frontend: Update job status
                Frontend->>Frontend: promoteNextPending()
            else Failed
                Backend-->>Frontend: {status: "failed", error_code}
                Frontend->>Frontend: Show error toast
            end
        end
        
        alt Still processing after 30s
            Frontend->>Frontend: Enter endurance loop (60s intervals)
            Frontend->>Backend: GET /status/{task_id} every 60s
        end
    end

    Note over Backend,VLM: Background Processing
    Backend->>Backend: asyncio.create_task(_run_processing())
    Backend->>VLM: vlm_adapter.ocr(image_path, enhance)
    
    alt PDF file
        VLM->>VLM: _render_pdf() → pypdfium2
        VLM->>VLM: _prepare_views() → PNG bytes
    else Image file
        VLM->>VLM: PIL image open
        VLM->>VLM: _prepare_views() → PNG bytes
    end
    
    VLM->>Worker: Put task in input_queue
    Worker->>Worker: Llama CPP inference
    Worker->>Worker: create_chat_completion()
    Worker->>VLM: Put result in output_queue
    VLM->>VLM: Post-process (GFM, noise filter)
    VLM->>Output: output_service.write()
    Output->>Output: Write {stem}_{HHmm}_{yyyyMMdd}.md
```

### 1.2 Key Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `FileDropZone` | `frontend/src/components/dropzone/FileDropZone.tsx` | File validation, batch cap enforcement |
| `scan2text.store` | `frontend/src/stores/scan2text.store.ts` | Job state, polling logic |
| `api.ts` | `frontend/src/lib/api.ts` | HTTP client functions |
| `_run_processing()` | `src/scan2text/api/main.py:98-165` | Background task orchestration |
| `VlmOcrAdapter` | `src/scan2text/adapters/vlm_ocr.py` | OCR engine wrapper |
| `_vlm_worker()` | `src/scan2text/adapters/vlm_ocr.py:91-161` | Persistent Llama CPP worker |
| `OutputService` | `src/scan2text/services/output_service.py` | Markdown file writing |

---

## 2. Model Download Pipeline

### 2.1 Sequence Diagram

```mermaid
sequenceDiagram
    participant App as React App
    participant Backend as Python Backend
    participant Downloader as ModelDownloaderService
    participant Disk as models/

    App->>Backend: GET /api/health
    Backend-->>App: {model: {files_present: false}}
    App->>App: setShowDownloader(true)
    App->>Backend: POST /api/download/start
    Backend->>Downloader: start_download()
    Downloader->>Disk: Read version.json
    Downloader->>Downloader: Spawn background thread
    
    alt Download in progress
        loop Every chunk (1MB)
            Downloader->>Disk: Write to .zip.part
            Downloader->>Downloader: Update progress state
        end
        Downloader->>Disk: Verify SHA256 + size
        alt Verification passed
            Downloader->>Disk: Rename .zip.part → .zip
            Downloader->>Disk: Extract .gguf from .zip
            Downloader->>Disk: Delete .zip
        else Verification failed
            Downloader->>Disk: Delete .zip
            Downloader->>Downloader: Set status = "failed"
        end
    end
    
    App->>Backend: GET /api/download/status (poll)
    Backend-->>App: {status, bytes_downloaded, total_bytes}
    
    alt Complete
        App->>App: setShowDownloader(false)
    else Cancelled
        Downloader->>Disk: Delete .part files
    end
```

### 2.2 Key Files

| File | Purpose |
|------|---------|
| `src/scan2text/services/model_downloader_service.py` | Download orchestration |
| `frontend/src/components/layout/ModelDownloaderModal.tsx` | Progress UI |
| `frontend/src/lib/api.ts:getSettings()` | Hydrate enhance toggle |

---

## 3. Settings Lifecycle

### 3.1 Flow Diagram

```mermaid
flowchart LR
    A[App Mount] --> B[GET /api/settings]
    B --> C{Settings exist?}
    C -->|No| D[Create defaults]
    C -->|Yes| E[Parse AppSettings]
    D --> F[Save to settings.json]
    E --> G[Hydrate UI]
    
    H[User changes setting] --> I[PUT /api/settings]
    I --> J[Atomic write via os.replace]
    J --> K[Update stored value]
    
    L[Theme toggle] --> M[localStorage write]
    M --> N[Debounced save to backend]
```

### 3.2 Key Components

| Component | Location |
|-----------|----------|
| `SettingsService` | `src/scan2text/services/settings_service.py` |
| `AppSettings` model | `src/scan2text/models/settings.py` |
| `preferencesStore` | `frontend/src/stores/preferencesStore.ts` |
| `SettingsDialog` | `frontend/src/components/layout/SettingsDialog.tsx` |

---

## 4. Backend Lifecycle

### 4.1 Startup Sequence

```mermaid
sequenceDiagram
    participant Tauri as Tauri Shell (Rust)
    participant Backend as scan2text-backend.exe
    participant Health as /api/health

    Tauri->>Tauri: boot_backend()
    alt Debug mode
        Tauri->>Tauri: Skip spawn (dev.ps1 manages backend)
    else Production
        Tauri->>Tauri: resolve_backend_path()
        Tauri->>Backend: Spawn with log redirection
        Tauri->>Tauri: watch_for_early_exit() thread
        loop Health check (30s timeout)
            Tauri->>Health: GET /api/health
            alt 200 OK
                Tauri->>Tauri: Backend ready
                break
            else Timeout
                Tauri->>Tauri: Emit backend-boot-failed
                Tauri->>Tauri: Exit with error
            end
        end
    end
```

### 4.2 Shutdown Sequence

```mermaid
sequenceDiagram
    participant Tauri as Tauri Shell
    participant OS as OS Process Manager
    participant Backend as scan2text-backend.exe

    Tauri->>Tauri: Window close / Exit event
    Tauri->>OS: taskkill /F /IM scan2text-backend.exe /T
    OS->>Backend: Signal terminate
    Backend->>Backend: Uvicorn shutdown
    Backend->>Tauri: Port 47351 released
    Tauri->>Tauri: wait_for_port_closed()
```

---

## 5. Job State Machine

### 5.1 Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Uploading: startUpload()
    Uploading --> Processing: POST /process returns 202
    Processing --> Completed: Poll returns completed
    Processing --> Failed: Poll returns failed / timeout
    Processing --> Background: 30s elapsed, still processing
    Background --> Completed: Poll returns completed
    Background --> Failed: Poll returns failed / health fail
    Completed --> [*]
    Failed --> Pending: retryJob()
    
    note right of Pending
        Job created, waiting for upload
        or queued behind active job
    end note
    
    note right of Processing
        Active job, polling frontend
        or backend processing
    end note
    
    note right of Background
        Extended processing (>30s)
        60s polling interval
    end note
```

### 5.2 Queue Management

**FIFO Order:** `jobOrder[]` array maintains insertion order.

**Active Job Logic:**
```typescript
// scan2text.store.ts:269-291
startNextPendingJob() {
  const nextJobId = jobOrder.find(jid => !TERMINAL_STATUSES.includes(jobs[jid].status))
  if (nextJobId) startUpload({ file: jobs[nextJobId].file, jobId: nextJobId })
}
```

---

## 6. Error Handling Flow

### 6.1 Error Propagation

```mermaid
flowchart TD
    A[OCR Failure] --> B{Error Type}
    B -->|MODEL_NOT_FOUND| C[Show downloader modal]
    B -->|PDF_TOO_COMPLEX| D[Toast: PDF too complex]
    B -->|FILE_TOO_COMPLEX| E[Toast: File too large]
    B -->|OCR_FAILED| F[Mark job failed]
    B -->|UNKNOWN| G[Log error, mark failed]
    
    H[Health Check Failure] --> I{Consecutive Failures}
    I -->|< 3| J[Continue polling]
    I -->|>= 3| K[Mark job failed + toast]
    
    L[Upload Failure] --> M[Promote next pending job]
```

### 6.2 Error Codes

| Code | Meaning | UI Response |
|------|---------|-------------|
| `MODEL_NOT_FOUND` | Model files missing | Show downloader modal |
| `PDF_TOO_COMPLEX` | Exceeds page limit | Toast info |
| `FILE_TOO_COMPLEX` | Exceeds 20MB | Toast info |
| `OCR_FAILED` | Inference failed | Job failed, retry available |
| `BACKEND_LOST` | Health check failed 3x | Toast error, job failed |

---

## 7. Feedback Flow

### 7.1 Offline Queue

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Disk as feedback/

    User->>Frontend: Click Feedback button
    Frontend->>Frontend: Show FeedbackDialog
    User->>Frontend: Submit message
    Frontend->>Backend: POST /api/feedback
    Backend->>Disk: Save to feedback/pending/{timestamp}.json
    Backend-->>Frontend: {filename}
    
    Note over Disk: Files persist until user<br/>manually opens feedback form
```

---

## 8. Path Resolution Flow

### 8.1 Home Directory Resolution

```mermaid
flowchart TD
    A[PathService.init] --> B{SCAN2TEXT_HOME env?}
    B -->|Yes| C[Use env value]
    B -->|No| D{Frozen exe?}
    D -->|Yes| E[exe_dir.parent.parent]
    D -->|No| F[Repo root\nparents[3]]
    
    C --> G[Set base_dir]
    E --> G
    F --> G
```

### 8.2 Output Path Generation

```mermaid
flowchart LR
    A[Source path] --> B[Sanitize stem]
    B --> C[Format timestamp]
    C --> D[{stem}_{HHmm}_{yyyyMMdd}.md]
    D --> E{Exists?}
    E -->|No| F[Return path]
    E -->|Yes| G[Append _2, _3, etc.]
    G --> E
```
