# Environment and Build

## Overview
This document describes the development environment, build processes, and deployment considerations for Scan2Text.

## Development Environment

### Supported Platforms
- **Operating System**: Windows 10/11 (x86_64)
- **Architecture**: CPU-only (no GPU dependencies)
- **Deployment Model**: Desktop-only, local-first, offline-capable

### Required Tools
- **Node.js**: >=18.x (for frontend development)
- **Python 3.12 (for backend development - Phase 7+)
- **Package Managers**: 
  - npm (frontend)
  - pip (backend - Phase 7+)
- **IDE**: VS Code recommended (with appropriate extensions)
- **Version Control**: Git

### Environment Variables
Frontend:
- None required for basic operation
- Vite automatically handles development/production modes

Backend (Phase 7+):
- `PYTHONPATH`: Set to `src` for proper module resolution
- Example: `$env:PYTHONPATH="src"; py -3.12 -m pytest`

## Frontend Build Process

### Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Internationalization**: react-i18next
- **Testing**: Vitest

### Build Commands
```powershell
# Install dependencies
npm install

# Type checking
npm run typecheck

# Run tests (with compact reporter)
npm run test -- --reporter=compact

# Start development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Build Configuration
- **vite.config.js**: Vite configuration with React plugin
- **tailwind.config.js**: Tailwind v3 configuration
- **postcss.config.js**: PostCSS setup for Tailwind
- **tsconfig.json**: TypeScript configuration (strict mode)
- **index.css**: Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities`)

### Output Structure
```
dist/
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
├── index.html
└── ... (other static assets)
```

## Backend Build Process (Phase 7+)

### Technology Stack
- **Language**: Python 3.12
- **Framework**: FastAPI
- **Validation**: Pydantic
- **OCR Engine**: llama-cpp-python (Ovis model)
- **Testing**: pytest

### Dependency Management
- **requirements.txt**: Python package dependencies
- **Virtual Environment**: Recommended for isolation
- **Installation**: `pip install -r requirements.txt`

### Build Commands
```powershell
# Set Python path
$env:PYTHONPATH="src"

# Install dependencies
pip install -r requirements.txt

# Run tests
py -3.12 -m pytest -q --tb=line

# Start development server
py -3.12 -m uvicorn src.main:app --reload

# Production server (example)
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

### Project Structure
```
backend/
├── src/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           └── process.py
│   ├── core/
│   │   ├── ocr_engine.py
│   │   └── task_manager.py
│   ├── config/
│   │   ├── settings.py
│   │   └── logging.py
│   ├── models/
│   │   ├── job.py
│   │   └── response.py
│   ├── utils/
│   │   └── naming.py
│   └── main.py
├── tests/
├── requirements.txt
└── ... (configuration files)
```

## Tauri Build Process (Future Phases)

### Planned Desktop Packaging
- **Framework**: Tauri 2.x
- **Language**: Rust (backend) + TypeScript/JavaScript (frontend)
- **Security**: CSP, sandboxing, minimal permissions
- **Update System**: Automatic updates via GitHub Releases

### Build Commands (Future)
```powershell
# Install Tauri CLI
cargo install tauri-cli

# Development build
tauri dev

# Production build
tauri build
```

### Tauri Configuration
- **tauri.conf.json**: Main configuration file
- **Capabilities**: Restricted filesystem access (output directory only)
- **Allowlists**: Minimal API exposure (only what is needed)
- **Windows**: Single window application (no multiple windows)
- **System Tray**: Optional background operation

## Code Quality and Standards

### Frontend Standards
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with React/TypeScript plugins
- **Formatting**: Prettier
- **Testing**: 
  - Unit tests with Vitest
  - Test coverage targets: 80%+
  - `data-testid` on all testable elements
  - Mock external dependencies (navigator.clipboard, etc.)

### Backend Standards (Phase 7+)
- **Python**: PEP 8 compliant
- **Linting**: flake8 or pylint
- **Formatting**: black
- **Type Hints**: Full type annotation coverage
- **Testing**: 
  - Unit tests with pytest
  - Test coverage targets: 80%+
  - Mock external dependencies (file system, network)

### Commit Standards
- **Conventional Commits**: feat:, fix:, docs:, style:, refactor:, perf:, test:, chore:
- **Scope**: Optional component/module scope
- **Breaking Changes**: Denoted with `!` or in footer
- **References**: Issue/PR references in footer

## Development Workflow

### Local Development Cycle
1. **Feature Branch**: Create from main
2. **Red-Green-Refactor**: 
   - Write failing test (RED)
   - Implement minimal code (GREEN)
   - Refactor for clarity (REFACTOR)
3. **Commit**: Frequent, atomic commits
4. **Push**: Regular pushes to remote
5. **Pull Request**: Title follows conventional commits
6. **Review**: At least one approval required
7. **Merge**: Squash merge to maintain clean history

### Testing Strategy
- **Unit Tests**: Isolated function/component testing
- **Integration Tests**: Cross-component workflows
- **End-to-End**: Planned for future (Playwright restricted by policy)
- **Manual Verification**: CEO screenshot approval for layout-critical UI

### Build Verification
Pre-commit checks:
```powershell
# Frontend
npm run typecheck
npm run test -- --reporter=compact
npm run build

# Backend (Phase 7+)
$env:PYTHONPATH="src"
py -3.12 -m pytest -q --tb=line
```

## Deployment and Distribution

### Current Distribution Model (Phases 1-6)
- **Direct Execution**: Run via `npm run dev` or built artifacts
- **No Installation Required**: Extract and run
- **Updates**: Manual replacement of executable/files
- **Version Tracking**: package.json version field

### Planned Distribution Model (Phase 7+)
- **Installer**: Tauri-generated platform-specific installers
- **Auto-update**: Silent background updates
- **Version Check**: On startup against GitHub releases
- **Rollback**: Previous version preservation

### Release Artifacts
- **Frontend Only**: ZIP archive of built frontend
- **Full Application**: Tauri installer (.exe for Windows)
- **Portable Version**: ZIP with runtime included
- **Version Manifest**: version.json hosted on GitHub

### Release Process
1. **Version Bump**: Update package.json and version.json
2. **Changelog**: Generate from conventional commits
3. **Build**: Production builds for all targets
4. **Test**: Verify functionality on target platforms
5. **Publish**: Upload to GitHub Releases
6. **Notify**: Update notification in application

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 version 1909 or later
- **CPU**: x86_64 processor (2+ cores recommended)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB available space
- **Display**: 1280x720 minimum resolution

### Performance Characteristics
- **Startup Time**: <5 seconds from launch to ready
- **Memory Usage**: <500 MB typical, <1 GB peak
- **CPU Usage**: 
  - Idle: <5%
  - Processing: Configurable (default 60% of logical cores)
- **File Handling**: 
  - Maximum concurrent files: 10 (batch limit)
  - Maximum file size: 50 MB per file
  - Supported formats: PNG, JPG, JPEG, WEBP, PDF

### Compatibility Notes
- **Offline-First**: No internet required for core functionality
- **Local-Only Backend**: Binding to 127.0.0.1 ensures no external exposure
- **No Telemetry**: Zero data collection by default
- **Privacy Focus**: No account creation or personal data storage
