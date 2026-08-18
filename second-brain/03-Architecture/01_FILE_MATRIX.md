# File Matrix

## Overview
This document maps the key files and modules in the Scan2Text codebase, organized by functionality and layer.

## Frontend Structure (`frontend/`)

### Core Application
- src/main.tsx - Entry point
- src/App.tsx - Root application component
- src/index.css - Global styles and Tailwind imports

### Layout Components
- src/components/layout/CommandCenterLayout.tsx - Main shell layout (TopBar, Main, BottomBar)
- src/components/layout/TopBar.tsx - Application header with logo and controls
- src/components/layout/BottomStatusBar.tsx - Status display with worker info and version
- src/components/layout/SettingsDialog.tsx - User preferences dialog

### Panel Components
- src/components/layout/panels/DropZonePanel.tsx - File drop zone interface
- src/components/layout/panels/QueuePanel.tsx - Job queue management
- src/components/layout/panels/PreviewPanel.tsx - Markdown preview display
- src/components/layout/panels/MarkdownPreview.tsx - Markdown rendering component

### UI Components
- src/components/dropzone/FileDropZone.tsx - Drag-and-drop file handling
- src/components/ui/ - shadcn/ui primitives (button, card, dialog, etc.)

### State Management
- src/stores/scan2text.store.ts - Zustand store for application state
- src/stores/scan2text.store.test.ts - Unit tests for the store

### Utilities
- src/lib/naming.ts - Output filename generation utilities
- src/lib/api.ts - Backend API communication layer
- src/lib/i18n.ts - Internationalization setup

### Localization
- src/locales/en.json - English translations
- src/locales/id.json - Indonesian translations

### Assets
- src/Images/ - Logo, brand image, and background assets

## Backend Structure (`backend/` - Phase 7)
*Note: Backend implementation occurs in Phase 7*

### Core Services
- src/main.py - FastAPI application entry point
- src/api/v1/endpoints/process.py - OCR processing endpoints
- src/core/ocr_engine.py - Ovis OCR engine wrapper
- src/core/task_manager.py - Job queue and status tracking
- src/utils/naming.py - Filename generation (mirrors frontend util)

### Configuration
- src/config/settings.py - Application configuration
- src/config/logging.py - Logging setup

### Models
- src/models/job.py - Job status and metadata models
- src/models/response.py - API response models

### Tests
- tests/ - Unit and integration tests (Phase 7)

## Shared Concepts

### Data Models
- Job: Represents an OCR processing task with states (pending, processing, completed, failed)
- File: Input file metadata (name, size, type, path)
- Output: Generated Markdown file metadata

### Communication Protocols
- REST API: JSON over HTTP for frontend-backend communication
- IPC: Tauri-specific communication for desktop integration (when applicable)

### Build Artifacts
- frontend/dist/ - Vite-built production assets
- backend/ - Python package (when packaged)
- release/ - Executable builds (via Tauri in later phases)

## Dependencies

### Frontend
- React 18+ with TypeScript
- Zustand for state management
- Tailwind CSS v3 for styling
- shadcn/ui for UI components
- react-markdown for Markdown rendering
- react-i18next for internationalization
- Vitest for testing

### Backend (Phase 7)
- Python 3.12
- FastAPI for web framework
- Pydantic for data validation
- llama-cpp-python for Ovis model integration
- pytest for testing

## File Naming Conventions
- Components: PascalCase (e.g., FileDropZone.tsx)
- Hooks: camelCase with "use" prefix (e.g., useJobQueue.ts)
- Utilities: camelCase (e.g., naming.ts)
- Styles: kebab-case in CSS/Tailwind classes
- Tests: .test.ts suffix
- Backend: snake_case for Python files and functions
