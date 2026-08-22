# Scan2Text — External Audit Fact Pack (S42a)

**Slice:** S42a-FACT-PACK  
**Date:** 2026-08-23  
**Baseline:** v1.0.0 GO (commit c65b606, known issue S41 deferred to app v1.1)  
**Scope:** Read-only evidence for external analyst audit — no repo access required.  
**Constraints:** Zero deletions, zero source edits, zero dependency installs. Excludes: models/, output/, logs/, feedback/, settings files, portable runtime tree, node_modules, target, __pycache__, .gguf, user documents.

---

## a. Git Tracked Files — Count + Full List

**Total tracked files: 571**

```
.gitignore
.graphifyignore
.vscode/settings.json
AGENTS-CTO.md
AGENTS.md
LICENSE
README.md
backend-spike.spec
dev-web.ps1
dev.ps1
fix_json.py
frontend/.gitignore
frontend/.npmrc
frontend/.oxlintrc.json
frontend/Images/bacground-left-top-panel.jpg
frontend/Images/logo.png
frontend/Images/text-light.jpg
frontend/Images/text.png
frontend/README.md
frontend/components.json
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/postcss.config.js
frontend/public/favicon.svg
frontend/public/icons.svg
frontend/scripts/validate-tauri-config.js
frontend/src-tauri/Cargo.lock
frontend/src-tauri/Cargo.toml
frontend/src-tauri/build.rs
frontend/src-tauri/capabilities/default.json
frontend/src-tauri/gen/schemas/acl-manifests.json
frontend/src-tauri/gen/schemas/capabilities.json
frontend/src-tauri/gen/schemas/desktop-schema.json
frontend/src-tauri/gen/schemas/windows-schema.json
frontend/src-tauri/icons/128x128.png
frontend/src-tauri/icons/128x128@2x.png
frontend/src-tauri/icons/1x1.png
frontend/src-tauri/icons/32x32.png
frontend/src-tauri/icons/icon.icns
frontend/src-tauri/icons/icon.ico
frontend/src-tauri/src/backend_process.rs
frontend/src-tauri/src/lib.rs
frontend/src-tauri/src/main.rs
frontend/src-tauri/tauri.conf.json
frontend/src-tauri/tests/backend_lifecycle.rs
frontend/src-tauri/tests/backend_manager_tests.rs
frontend/src/App.css
frontend/src/App.test.tsx
frontend/src/App.tsx
frontend/src/__tests__/s34-frontend-polish.test.tsx
frontend/src/assets/fonts/Quantico-Regular.ttf
frontend/src/assets/hero.png
frontend/src/assets/react.svg
frontend/src/assets/vite.svg
frontend/src/components/dropzone/FileDropZone.test.tsx
frontend/src/components/dropzone/FileDropZone.toast.test.tsx
frontend/src/components/dropzone/FileDropZone.tsx
frontend/src/components/layout/BottomStatusBar.test.tsx
frontend/src/components/layout/BottomStatusBar.tsx
frontend/src/components/layout/CommandCenterLayout.test.tsx
frontend/src/components/layout/CommandCenterLayout.tsx
frontend/src/components/layout/FeedbackButton.test.tsx
frontend/src/components/layout/FeedbackButton.tsx
frontend/src/components/layout/FeedbackDialog.test.tsx
frontend/src/components/layout/FeedbackDialog.tsx
frontend/src/components/layout/ModelDownloaderModal.test.tsx
frontend/src/components/layout/ModelDownloaderModal.tsx
frontend/src/components/layout/SettingsDialog.test.tsx
frontend/src/components/layout/SettingsDialog.tsx
frontend/src/components/layout/TopBar.test.tsx
frontend/src/components/layout/TopBar.tsx
frontend/src/components/layout/WelcomeModal.test.tsx
frontend/src/components/layout/WelcomeModal.tsx
frontend/src/components/layout/panels/DropZonePanel.test.tsx
frontend/src/components/layout/panels/DropZonePanel.tsx
frontend/src/components/layout/panels/MarkdownPreview.test.tsx
frontend/src/components/layout/panels/MarkdownPreview.tsx
frontend/src/components/layout/panels/PreviewPanel.test.tsx
frontend/src/components/layout/panels/PreviewPanel.tsx
frontend/src/components/layout/panels/QueuePanel.icons.test.tsx
frontend/src/components/layout/panels/QueuePanel.integration.test.tsx
frontend/src/components/layout/panels/QueuePanel.test.tsx
frontend/src/components/layout/panels/QueuePanel.tsx
frontend/src/components/layout/panels/ScrollAreas.test.tsx
frontend/src/components/ui/button.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/label.tsx
frontend/src/components/ui/scroll-area.tsx
frontend/src/components/ui/spinner.tsx
frontend/src/components/ui/tooltip.tsx
frontend/src/hooks/useBackendBootFailedListener.test.ts
frontend/src/hooks/useBackendBootFailedListener.ts
frontend/src/hooks/useProgressSocket.test.ts
frontend/src/hooks/useProgressSocket.ts
frontend/src/i18n/i18n.test.ts
frontend/src/i18n/index.ts
frontend/src/i18n/resources.test.ts
frontend/src/index.css
frontend/src/lib/api.test.ts
frontend/src/lib/api.ts
frontend/src/lib/apiBase.test.ts
frontend/src/lib/apiBase.ts
frontend/src/lib/cleanupObjectURLs.test.ts
frontend/src/lib/cleanupObjectURLs.ts
frontend/src/lib/depthStyles.test.ts
frontend/src/lib/depthStyles.ts
frontend/src/lib/fileKind.test.ts
frontend/src/lib/fileKind.ts
frontend/src/lib/fileValidation.test.ts
frontend/src/lib/fileValidation.ts
frontend/src/lib/formatBytes.test.ts
frontend/src/lib/formatBytes.ts
frontend/src/lib/naming.test.ts
frontend/src/lib/naming.ts
frontend/src/lib/preferences.test.ts
frontend/src/lib/preferences.ts
frontend/src/lib/progressManager.test.ts
frontend/src/lib/progressManager.ts
frontend/src/lib/utils.ts
frontend/src/locales/en.json
frontend/src/locales/id.json
frontend/src/main.tsx
frontend/src/services/uploadService.test.ts
frontend/src/services/uploadService.ts
frontend/src/stores/fileStore.test.ts
frontend/src/stores/fileStore.ts
frontend/src/stores/preferencesStore.persistence.test.ts
frontend/src/stores/preferencesStore.test.ts
frontend/src/stores/preferencesStore.ts
frontend/src/stores/scan2text.store.test.ts
frontend/src/stores/scan2text.store.ts
frontend/src/test-setup.ts
frontend/src/theme/palette-lock.test.ts
frontend/src/vite-env.d.ts
frontend/tailwind.config.js
frontend/tsconfig.app.json
frontend/tsconfig.json
frontend/tsconfig.node.json
frontend/vite.config.ts
frontend/vite.test.config.ts
packaging/scan2text-backend-console-diag.spec
packaging/scan2text-backend.spec
pyproject.toml
pytest.ini
scripts/build-backend.ps1
scripts/cleanroom-boot.ps1
scripts/probe-backend-ocr.ps1
scripts/two-exe-probe.ps1
scripts/verify-portable.ps1
second-brain/00-Current-State.md
second-brain/00-Inbox/backups/AGENTS-CTO.md-20260812-1637
second-brain/00-Inbox/backups/AGENTS-pre-diet-2026-08-13.md
second-brain/00-Inbox/backups/AGENTS.md-20260812-1637
second-brain/00-Inbox/prd-early-dont-use.md
second-brain/01-Agent-Memory/Archive/agents-diet-2026-08-13.md
second-brain/01-Agent-Memory/Archive/agents-manual-cleanup-2026-08-12.md
second-brain/01-Agent-Memory/Archive/slice-9-3-tauri-backend-lifecycle.md
second-brain/01-Agent-Memory/Archive/state-history.md
second-brain/01-Agent-Memory/Phase-10/slice-10-backend-rebuild.md
second-brain/01-Agent-Memory/Phase-10/slice-10-diag3-config-divergence-fix.md
second-brain/01-Agent-Memory/Phase-10/slice-10-e2e-packaged-verification.md
second-brain/01-Agent-Memory/Phase-10/slice-10-fix2-clean-rebuild.md
second-brain/01-Agent-Memory/Phase-10/slice-10-fix8-deadlock-freeze-executor.md
second-brain/01-Agent-Memory/Phase-10/slice-11-fix28b-portable-settings-path.md
second-brain/01-Agent-Memory/Phase-10/slice-11-path-math-ghost-name-fix.md
second-brain/01-Agent-Memory/Phase-10/slice-11-rust-boot-log.md
second-brain/01-Agent-Memory/Phase-10/slice-11b-pollJob-green.md
second-brain/01-Agent-Memory/Phase-10/slice-11c-testscope-config.md
second-brain/01-Agent-Memory/Phase-10/slice-12-option-a-commit-prep.md
second-brain/01-Agent-Memory/Phase-10/slice-12a-backend-rebuild-swap.md
second-brain/01-Agent-Memory/Phase-10/slice-13b-bootgate-swap.md
second-brain/01-Agent-Memory/Phase-10/slice-S10-FIX12b-shell-rebuild-swap.md
second-brain/01-Agent-Memory/Phase-10/slice-S10-FIX23-Queue-Promotion.md
second-brain/01-Agent-Memory/Phase-10/slice-S10-FIX29-Tauri-Config-Schema-Fix.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-DIAG-Packaged-Regressions-Forensics.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-DOC-PRD-50PageLimit-v1.1-Backlog.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-DOC-Rename-Backend-Folder.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-DOC-Targeted-Test-Rule.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-DOC-Update-CTO-Manual-PreRead.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX33a-SettingsDialog-RED.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX33b-SettingsDialog-GREEN.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX34a-Settings-EffectiveOutputDir.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX34b-OpenFolder-EndToEnd.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX37-Rebuild-Swap-Registry.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX38-Pypdfium2-Bundling.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX39-ImgTag-Policy.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX40-Downloader-RetryUX.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX41a-SingleScriptRebuild.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX41b-PDF-LiveProof.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX41b-Retry2-PDF-LiveProof.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX42-Forensics-SpecDll.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX43a-Spec-Onedir.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX43b-Rebuild-Probe-Onedir.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX44-VlmOcr-Pdfium-Import.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX45-Backend-Rebuild-Probe.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX46-PDFChartCrops.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX47-Backend-Rebuild-Probe-Crops.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX48r-GuardLiveSettings-Complete.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX49-RejectToast-SettingsPointer.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX51-TimeoutAutoScale.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX52-PollingEndurance.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX53-Rebuild-Probe-Final.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX54-TwoMinHint.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX55-Enforce50PageLimit.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX56-Final-Rebuild-Swap-Probe.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX57-Align-Backend-Paths.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX60-Welcome-Screen-GFM-Verify.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX61-Final-Rebuild-Swap-Smoke.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX62-Backend-Lifecycle.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX65B-Test-Mock-Fix.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX65C1-Rust-TryClone-Compat.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX67-UPX-OFF-REBUILD.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX68-PY-CONSOLE-TRUE.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX70-BootGuard-SelfSkip.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX72-HEALTH-RETRY-RESILIENCE.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX73-STATUS-SEMANTICS.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX74-PDF-PAGE-RESILIENCE.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX75-HEALTH404-TYPO.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-FIX76-RUST-ORPHAN-KILL.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-GATE3-BACKEND-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-GATE3-RETRY.md
second-brain/01-Agent-Memory/Phase-10/slice-S11-GATE4-TAURI-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-10/slice-S12-FIX-DOWNLOADER-PATH-TARGETS.md
second-brain/01-Agent-Memory/Phase-10/slice-S12-FRONTEND-DOWNLOADER-MODAL-MATRIX.md
second-brain/01-Agent-Memory/Phase-10/slice-S12-GATE-RC-BUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-10/slice-S14-FIX-MOCK-HEALTH-FLIP.md
second-brain/01-Agent-Memory/Phase-10/slice-S16-FIX-HEALTH-CONTRACT-TEST.md
second-brain/01-Agent-Memory/Phase-10/slice-S17-CLEANUP-DEBUG-GHOSTS.md
second-brain/01-Agent-Memory/Phase-10/slice-S18-GATE-LEAN-FINAL.md
second-brain/01-Agent-Memory/Phase-10/slice-S20-FIX-PATHSERVICE-APP-ROOT-PACKAGED.md
second-brain/01-Agent-Memory/Phase-10/slice-S21-GATE-BACKEND-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-10/slice-S24-FIX-PATHSERVICE-PORTABLE-ROOT-ANCHOR.md
second-brain/01-Agent-Memory/Phase-10/slice-S25-FIX-RUST-KILL-IMAGE-NAME.md
second-brain/01-Agent-Memory/Phase-10/slice-S28-BACKEND-ZIP-EXTRACTION.md
second-brain/01-Agent-Memory/Phase-10/slice-S32-FIX-FEEDBACK-API-TESTS.md
second-brain/01-Agent-Memory/Phase-10/slice-S32-FIX-IMPORT-CHAIN.md
second-brain/01-Agent-Memory/Phase-10/slice-S32b-engine-modelname-webview-removal.md
second-brain/01-Agent-Memory/Phase-10/slice-S33b-rebuild-deploy.md
second-brain/01-Agent-Memory/Phase-10/slice-S34-frontend-polish.md
second-brain/01-Agent-Memory/Phase-10/slice-S35-fix-stale-welcomemodal-test.md
second-brain/01-Agent-Memory/Phase-10/slice-S35-gate-shell.md
second-brain/01-Agent-Memory/Phase-10/slice-S37-gate-rebuild-verify.md
second-brain/01-Agent-Memory/Phase-10/slice-S38-backend-fixes.md
second-brain/01-Agent-Memory/Phase-10/slice-S39-frontend-welcome.md
second-brain/01-Agent-Memory/Phase-10/slice-S40-gate-rebuild-both.md
second-brain/01-Agent-Memory/Phase-10/slice-S41-prd-v1-known-issue.md
second-brain/01-Agent-Memory/Phase-11/diag-S13-FRONTEND-MODELREADY-TEST.md
second-brain/01-Agent-Memory/Phase-11/diag-S15-BACKEND-HEALTH-CONTRACT.md
second-brain/01-Agent-Memory/Phase-11/diag-S19-MANIFEST-NOT-FOUND-PACKAGED.md
second-brain/01-Agent-Memory/Phase-11/diag-S22-MANIFEST-MODELS-ABSENT.md
second-brain/01-Agent-Memory/Phase-11/diag-S23-ZOMBIE-BACKEND-KILL-TREE.md
second-brain/01-Agent-Memory/Phase-11/slice-11-fix32-rebuild-and-swap.md
second-brain/01-Agent-Memory/Phase-11/slice-11-rust-dev-mode-backend-spawn.md
second-brain/01-Agent-Memory/Phase-11/slice-43c-Recovery-Swap-Probe.md
second-brain/01-Agent-Memory/Phase-11/slice-59-align-error-codes-blackdot-20mb.md
second-brain/01-Agent-Memory/Phase-11/slice-71-queue-pump-promote.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG2-Smoke-Failures-Forensics.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-DOC-PRD-50PageLimit-v1.1-Backlog.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-DOC-Rename-Backend-Folder.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-DOC-Targeted-Test-Rule.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-DOC-Update-CTO-Manual-PreRead.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX33a-SettingsDialog-RED.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX33b-SettingsDialog-GREEN.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX34a-Settings-EffectiveOutputDir.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX34b-OpenFolder-EndToEnd.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX37-Rebuild-Swap-Registry.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX38-Pypdfium2-Bundling.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX39-ImgTag-Policy.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX40-Downloader-RetryUX.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX41a-SingleScriptRebuild.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX41b-PDF-LiveProof.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX41b-Retry2-PDF-LiveProof.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX42-Forensics-SpecDll.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX43a-Spec-Onedir.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX43b-Rebuild-Probe-Onedir.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX44-VlmOcr-Pdfium-Import.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX45-Backend-Rebuild-Probe.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX46-PDFChartCrops.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX47-Backend-Rebuild-Probe-Crops.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX48r-GuardLiveSettings-Complete.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX49-RejectToast-SettingsPointer.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX51-TimeoutAutoScale.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX52-PollingEndurance.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX53-Rebuild-Probe-Final.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX54-TwoMinHint.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX55-Enforce50PageLimit.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX56-Final-Rebuild-Swap-Probe.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX57-Align-Backend-Paths.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX60-Welcome-Screen-GFM-Verify.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX61-Final-Rebuild-Swap-Smoke.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX62-Backend-Lifecycle.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX65B-Test-Mock-Fix.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX65C1-Rust-TryClone-Compat.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX67-UPX-OFF-REBUILD.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX68-PY-CONSOLE-TRUE.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX70-BootGuard-SelfSkip.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX72-HEALTH-RETRY-RESILIENCE.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX73-STATUS-SEMANTICS.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX74-PDF-PAGE-RESILIENCE.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX75-HEALTH404-TYPO.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX76-RUST-ORPHAN-KILL.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-GATE3-BACKEND-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-GATE3-RETRY.md
second-brain/01-Agent-Memory/Phase-11/slice-S11-GATE4-TAURI-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-11/slice-S12-FIX-DOWNLOADER-PATH-TARGETS.md
second-brain/01-Agent-Memory/Phase-11/slice-S12-FRONTEND-DOWNLOADER-MODAL-MATRIX.md
second-brain/01-Agent-Memory/Phase-11/slice-S12-GATE-RC-BUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-11/slice-S14-FIX-MOCK-HEALTH-FLIP.md
second-brain/01-Agent-Memory/Phase-11/slice-S16-FIX-HEALTH-CONTRACT-TEST.md
second-brain/01-Agent-Memory/Phase-11/slice-S17-CLEANUP-DEBUG-GHOSTS.md
second-brain/01-Agent-Memory/Phase-11/slice-S18-GATE-LEAN-FINAL.md
second-brain/01-Agent-Memory/Phase-11/slice-S20-FIX-PATHSERVICE-APP-ROOT-PACKAGED.md
second-brain/01-Agent-Memory/Phase-11/slice-S21-GATE-BACKEND-REBUILD-DEPLOY.md
second-brain/01-Agent-Memory/Phase-11/slice-S24-FIX-PATHSERVICE-PORTABLE-ROOT-ANCHOR.md
second-brain/01-Agent-Memory/Phase-11/slice-S25-FIX-RUST-KILL-IMAGE-NAME.md
second-brain/01-Agent-Memory/Phase-11/slice-S28-BACKEND-ZIP-EXTRACTION.md
second-brain/01-Agent-Memory/Phase-11/slice-S32-FIX-FEEDBACK-API-TESTS.md
second-brain/01-Agent-Memory/Phase-11/slice-S32-FIX-IMPORT-CHAIN.md
second-brain/01-Agent-Memory/Phase-11/slice-S32b-engine-modelname-webview-removal.md
second-brain/01-Agent-Memory/Phase-11/slice-S33b-rebuild-deploy.md
second-brain/01-Agent-Memory/Phase-11/slice-S34-frontend-polish.md
second-brain/01-Agent-Memory/Phase-11/slice-S35-fix-stale-welcomemodal-test.md
second-brain/01-Agent-Memory/Phase-11/slice-S35-gate-shell.md
second-brain/01-Agent-Memory/Phase-11/slice-S37-gate-rebuild-verify.md
second-brain/01-Agent-Memory/Phase-11/slice-S38-backend-fixes.md
second-brain/01-Agent-Memory/Phase-11/slice-S39-frontend-welcome.md
second-brain/01-Agent-Memory/Phase-11/slice-S40-gate-rebuild-both.md
second-brain/01-Agent-Memory/Phase-2/Slice-2-Summary.md
second-brain/01-Agent-Memory/Phase-2/Slice-2.5-Summary.md
second-brain/01-Agent-Memory/Phase-2/Slice-2.6-Summary.md
second-brain/01-Agent-Memory/Phase-2/Slice-3-Summary.md
second-brain/01-Agent-Memory/Phase-2/Slice-5-Summary.md
second-brain/01-Agent-Memory/Phase-2/Slice-6-Summary.md
second-brain/01-Agent-Memory/Phase-2/phase2-completion-summary.md
second-brain/01-Agent-Memory/Phase-3/Slice-8-Summary.md
second-brain/01-Agent-Memory/Phase-3/slice-6-5-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-10-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-11-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-11.5-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-11.6-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-12a-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-12b-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-12c-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-12d-summary.md
second-brain/01-Agent-Memory/Phase-4/slice-12e-summary.md
second-brain/01-Agent-Memory/Phase-5/Phase-5-command-center-plan.md
second-brain/01-Agent-Memory/Phase-5/Phase-5-command-center-ui-plan.md
second-brain/01-Agent-Memory/Phase-5/phase-5-final-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-13-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-13.2-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-14-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-15-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-16-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-17-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-18-3-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-19-2-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-19-3-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-19.1-summary.md
second-brain/01-Agent-Memory/Phase-5/slice-19.4-patch-zustand-infinite-loop-fix.md
second-brain/01-Agent-Memory/Phase-5/slice-20.1-final-summary.md
second-brain/01-Agent-Memory/Phase-6/Beautify Backlog.md
second-brain/01-Agent-Memory/Phase-6/PHASE-6-COMPLETE.md
second-brain/01-Agent-Memory/Phase-6/Untitled.md
second-brain/01-Agent-Memory/Phase-6/hex-table-coffee-paper.md
second-brain/01-Agent-Memory/Phase-6/slice-20.1-multi-file-batch-validation.md
second-brain/01-Agent-Memory/Phase-6/slice-20.2-demo-mode-core.md
second-brain/01-Agent-Memory/Phase-6/slice-20.3-preview-panel-docs-compliance.md
second-brain/01-Agent-Memory/Phase-6/slice-20.4-naming-and-actions.md
second-brain/01-Agent-Memory/Phase-6/slice-20.5-fake-system-chrome.md
second-brain/01-Agent-Memory/Phase-6/slice-20.5-hotfix-layout-grid-ui-polish.md
second-brain/01-Agent-Memory/Phase-6/slice-6-10-thumbnail-fix.md
second-brain/01-Agent-Memory/Phase-6/slice-6-11-calm-theme.md
second-brain/01-Agent-Memory/Phase-6/slice-6-12-feedback-pass.md
second-brain/01-Agent-Memory/Phase-6/slice-6-12b-alignment-gradients-lightmode.md
second-brain/01-Agent-Memory/Phase-6/slice-6-12c-uniform-spacing-vertical-gradients.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14d-visual-hotfix.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14e-queue-dropzone-depth.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14f-status-slot-bottombar-buttons.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14g-forensics-live-tree-fix.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14h-radix-tray-fix.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14j-absolute-viewport-lock.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14k-widths-scrollbars.md
second-brain/01-Agent-Memory/Phase-6/slice-6-14z-panel-minw0.md
second-brain/01-Agent-Memory/Phase-6/slice-6-9-visual-polish.md
second-brain/01-Agent-Memory/Phase-6/slice-6.10b-thumbnail-removal-recovery.md
second-brain/01-Agent-Memory/Phase-6/slice-6.12d-coffee-paper-palette.md
second-brain/01-Agent-Memory/Phase-6/slice-6.12e-depth-pass.md
second-brain/01-Agent-Memory/Phase-6/slice-6.12f-overflow-hygiene.md
second-brain/01-Agent-Memory/Phase-6/slice-6.13-identity-finale.md
second-brain/01-Agent-Memory/Phase-6/slice-6.13b-depth-presence.md
second-brain/01-Agent-Memory/Phase-6/slice-6.14a-literal-wordmark-floating-layout.md
second-brain/01-Agent-Memory/Phase-6/slice-6.14b-scrollareas-file-icons.md
second-brain/01-Agent-Memory/Phase-6/slice-6.15a-manual-hygiene.md
second-brain/01-Agent-Memory/Phase-6/slice-6.15b-qa-script.md
second-brain/01-Agent-Memory/Phase-6/slice-6.15c-prd-commit.md
second-brain/01-Agent-Memory/Phase-6/slice-6.16a-queue-messaging.md
second-brain/01-Agent-Memory/Phase-6/slice-6.16b-shell-affordances.md
second-brain/01-Agent-Memory/Phase-6/slice-6.16c-id-copy.md
second-brain/01-Agent-Memory/Phase-6/slice-6.17-closure.md
second-brain/01-Agent-Memory/Phase-6/slice-6.x-tailwind-pipeline-hotfix.md
second-brain/01-Agent-Memory/Phase-7/audit-adr007-state.md
second-brain/01-Agent-Memory/Phase-7/audit-python-version.md
second-brain/01-Agent-Memory/Phase-7/bugfix-feedback-count.md
second-brain/01-Agent-Memory/Phase-7/fix-s9-3-tauri-x-close-backend-shutdown.md
second-brain/01-Agent-Memory/Phase-7/issue-s10-entry-point.md
second-brain/01-Agent-Memory/Phase-7/issue-s10-portable-backend.md
second-brain/01-Agent-Memory/Phase-7/issue-s10-tooltip-overlap-diagnosis.md
second-brain/01-Agent-Memory/Phase-7/issue-s10-ui-bugs-diagnosis.md
second-brain/01-Agent-Memory/Phase-7/slice-10-fix3-ui-tooltip-icon.md
second-brain/01-Agent-Memory/Phase-7/slice-10-fix4-tooltip-visibility.md
second-brain/01-Agent-Memory/Phase-7/slice-10-portable-assembly.md
second-brain/01-Agent-Memory/Phase-7/slice-10-portable-backend-fix.md
second-brain/01-Agent-Memory/Phase-7/slice-10-portable-refresh.md
second-brain/01-Agent-Memory/Phase-7/slice-10-r1-redo-pathservice.md
second-brain/01-Agent-Memory/Phase-7/slice-10-r2-redo-backend-rebuild.md
second-brain/01-Agent-Memory/Phase-7/slice-7-1a-backend-bootstrap.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2a-retire-backend.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2b-settings-engine-knobs.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2c-hygiene-unignore-models.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2d-health-contract.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2e-consolidate-api.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2f-worker-busy.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-fix-speed-resilience.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-fix2-resolution.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-fix3-output-budget.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-fix4-auto-scale-tiling.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-fix5-daemon-worker.md
second-brain/01-Agent-Memory/Phase-7/slice-7-2g-real-vlm-wiring.md
second-brain/01-Agent-Memory/Phase-7/slice-8-2-doc-lock.md
second-brain/01-Agent-Memory/Phase-7/slice-8-2-welcome-screen.md
second-brain/01-Agent-Memory/Phase-7/slice-8-3-cpu-budget.md
second-brain/01-Agent-Memory/Phase-7/slice-8-4-feedback-button.md
second-brain/01-Agent-Memory/Phase-7/slice-8-5-privacy-filter.md
second-brain/01-Agent-Memory/Phase-7/slice-8-6-distribution.md
second-brain/01-Agent-Memory/Phase-7/slice-8-7a-backend-downloader.md
second-brain/01-Agent-Memory/Phase-7/slice-8-7b-frontend-downloader.md
second-brain/01-Agent-Memory/Phase-7/slice-8-7c-dual-model-schema.md
second-brain/01-Agent-Memory/Phase-7/slice-9-1b-tauri-dev-plumbing.md
second-brain/01-Agent-Memory/Phase-7/slice-9-1c-fix-vite-tauri-watch-conflict.md
second-brain/01-Agent-Memory/Phase-7/slice-9-1d-fix-downloader-windows-rename-and-disk-ack.md
second-brain/01-Agent-Memory/Phase-7/slice-9-2-docs-hygiene-agents-role-split.md
second-brain/01-Agent-Memory/Phase-7/slice-9-2a-standalone-backend-artifact.md
second-brain/01-Agent-Memory/Phase-7/slice-9-3a-pure-rust-backend-manager.md
second-brain/01-Agent-Memory/Phase-7/slice-9-4a-frontend-api-base-url-resolver.md
second-brain/01-Agent-Memory/Phase-7/slice-9-4b-1-feedbackdialog-welcomemodal-wiring.md
second-brain/01-Agent-Memory/Phase-7/slice-9-4b-2-modeldownloader-wiring.md
second-brain/01-Agent-Memory/Phase-7/slice-9-4b-3-api-uploadservice-wiring.md
second-brain/01-Agent-Memory/Phase-7/slice-9-4b-4-app-wiring.md
second-brain/01-Agent-Memory/Phase-7/slice-9-5-tauri-forensics.md
second-brain/01-Agent-Memory/Phase-7/slice-9-6-tauri-bundle-resources.md
second-brain/01-Agent-Memory/Phase-7/slice-9-7-fix-config-regression.md
second-brain/01-Agent-Memory/Phase-7/slice-9-7-rust-ignition.md
second-brain/01-Agent-Memory/Phase-7/slice-9-8-fix-bundle-identifier.md
second-brain/01-Agent-Memory/Phase-7/slice-9-8-production-build.md
second-brain/01-Agent-Memory/Phase-7/slice-S3-upgrade.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-01-adr-008-tauri-shell.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-02-prd-03-tauri-alignment.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-03-agents-45k-cap.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-04-prd-01-tauri-alignment.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-05-prd-04-s19-to-prd-03.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-09-poison-file-cleanup.md
second-brain/01-Agent-Memory/Phase-7/slice-doc-11-agents-diet.md
second-brain/01-Agent-Memory/Phase-7/slice-fix-backend-startup-resilience.md
second-brain/01-Agent-Memory/Phase-7/slice-kill-the-cache-bug.md
second-brain/01-Agent-Memory/Phase-7/slice-live-fire-prep.md
second-brain/01-Agent-Memory/Phase-7/slice-ovis-port-adapter.md
second-brain/01-Agent-Memory/Phase-7/slice-ovis-spike.md
second-brain/01-Agent-Memory/Phase-7/slice-s3-postprocess-service.md
second-brain/01-Agent-Memory/Phase-7/spike-pyinstaller.md
second-brain/01-Agent-Memory/S10-fix-clean-bytes-rebuild.md
second-brain/02-qa/CEO-Final-Exam.md
second-brain/02-qa/E2E-Packaged-Verif-Kitchen-Sink-QA.md
second-brain/02-qa/Test-Final.md
second-brain/02-qa/Untitled.md
second-brain/02-qa/phase-7/s9-1b-tauri-dev-plumbing.md
second-brain/02-qa/s10-e2e-packaged-verification.md
second-brain/02-qa/scan2text-phase6-manual-test.md
second-brain/02-qa/v1.0.0-release-decision.md
second-brain/03-Architecture/01_FILE_MATRIX.md
second-brain/03-Architecture/02_IPC_AND_API_CONTRACTS.md
second-brain/03-Architecture/03_DATA_FLOWS.md
second-brain/03-Architecture/04_ENVIRONMENT_AND_BUILD.md
second-brain/03-Architecture/ADRs/001-optimistic-ui.md
second-brain/03-Architecture/ADRs/002-websockets-over-polling.md
second-brain/03-Architecture/ADRs/ADR-003-platform-agnostic-file-upload.md
second-brain/03-Architecture/ADRs/ADR-004-Second-Brain Vault Consolidation.md
second-brain/03-Architecture/ADRs/ADR-005-Consolidate the backend.md
second-brain/03-Architecture/ADRs/ADR-006-ovisocr2-engine-swap.md
second-brain/03-Architecture/ADRs/ADR-007-feedback-cpu-budget-gdrive-distribution.md
second-brain/03-Architecture/ADRs/ADR-007-feedback-cpu-welcome-distribution-log-privacy.md
second-brain/03-Architecture/ADRs/ADR-008-tauri-desktop-shell-packaging.md
second-brain/03-Architecture/ARCHITECTURE.md
second-brain/04-Product/01-product-and-scope.md
second-brain/04-Product/02-functional-requirements.md
second-brain/04-Product/03-non-functional-and-architecture.md
second-brain/04-Product/04-testing-and-engineering-rules.md
second-brain/05-Sprints/Sprint 1 Review.md
second-brain/05-Sprints/Sprint 2 - Phase 4.md
second-brain/05-Sprints/Sprint 3 - Phase 6.md
src/scan2text/adapters/__init__.py
src/scan2text/adapters/ocr_engine.py
src/scan2text/adapters/vlm_ocr.py
src/scan2text/api/__init__.py
src/scan2text/api/main.py
src/scan2text/api/websocket_manager.py
src/scan2text/boot_guard.py
src/scan2text/cli.py
src/scan2text/engine.py
src/scan2text/models/__init__.py
src/scan2text/models/errors.py
src/scan2text/models/job.py
src/scan2text/models/ocr_result.py
src/scan2text/models/settings.py
src/scan2text/routes/__init__.py
src/scan2text/routes/download.py
src/scan2text/routes/feedback.py
src/scan2text/routes/health.py
src/scan2text/routes/jobs.py
src/scan2text/routes/settings.py
src/scan2text/services/__init__.py
src/scan2text/services/feedback_service.py
src/scan2text/services/file_service.py
src/scan2text/services/logging_service.py
src/scan2text/services/model_downloader_service.py
src/scan2text/services/output_service.py
src/scan2text/services/path_service.py
src/scan2text/services/pdf_service.py
src/scan2text/services/postprocess_service.py
src/scan2text/services/queue_service.py
src/scan2text/services/settings_service.py
src/scan2text/services/update_service.py
src/scan2text/smoke.py
src/scan2text/ui/static/app.js
src/scan2text/ui/static/index.html
src/scan2text/ui/static/styles.css
src/scan2text/utils/__init__.py
src/scan2text/utils/cpu_budget.py
src/scan2text/utils/prod_runtime.py
standards/architecture/ADR-Standard.md
standards/architecture/API-contract.md
standards/architecture/Database-Schema.md
standards/design/UI-specs.md
standards/devops/Deployment-Guide.md
standards/devops/Runbook.md
standards/engineering/Code-review-checklist.md
standards/engineering/Testing-standards.md
standards/product/PRD-template.md
standards/product/PRD.md
standards/product/User-Story.md
tests/conftest.py
tests/fakes/__init__.py
tests/fakes/ocr.py
tests/integration/__init__.py
tests/integration/test_batch_processing.py
tests/integration/test_output_generation.py
tests/integration/test_pdf_handling.py
tests/integration/test_phase2_pipeline.py
tests/integration/test_queue_service.py
tests/test_api.py
tests/test_api_download.py
tests/test_api_feedback.py
tests/test_api_surface.py
tests/test_boot_guard.py
tests/test_cli.py
tests/test_health.py
tests/test_no_text_guard.py
tests/test_noise_filter.py
tests/test_packaging_spec.py
tests/test_pdf_chart_crops.py
tests/test_pdf_guard_settings.py
tests/test_s38_backend_fixes.py
tests/test_settings_effective_output.py
tests/test_status_semantics.py
tests/test_timeout_autoscale.py
tests/test_vlm_ocr.py
tests/test_vlm_ocr_pdf_page_resilience.py
tests/test_vlm_ocr_pdfium_import.py
tests/unit/adapters/__init__.py
tests/unit/adapters/test_vlm_ocr_routing.py
tests/unit/services/__init__.py
tests/unit/services/test_feedback_service.py
tests/unit/services/test_feedback_service_feedback_dir.py
tests/unit/services/test_file_service.py
tests/unit/services/test_logging_service.py
tests/unit/services/test_model_downloader_service.py
tests/unit/services/test_models_dir_priority.py
tests/unit/services/test_output_service.py
tests/unit/services/test_path_service.py
tests/unit/services/test_path_service_frozen.py
tests/unit/services/test_path_service_models_resolution.py
tests/unit/services/test_postprocess_service.py
tests/unit/services/test_queue_service.py
tests/unit/services/test_settings_service.py
tests/unit/test_engine_webview_removal.py
tests/unit/test_error_mapping.py
tests/unit/test_file_naming.py
tests/unit/test_prod_runtime.py
tests/unit/test_settings_validation.py
tests/unit/test_version_comparison.py
tests/unit/utils/__init__.py
tests/unit/utils/test_cpu_budget.py
tools/gdrive_probe.bin
tools/gdrive_probe2.bin
tools/ocr_bench.py
tools/port_check.py
tools/prep_dummy_gdrive.py
tools/smoke_backend_exe.ps1
tools/smoke_test_s4.py
tools/spike_pyinstaller.py
version.json
```

---

## b. Repo Folder Tree (Depth 3, Excluded Paths Filtered)

Excluded from display: `node_modules/`, `target/`, `dist/`, `__pycache__/`, `.git/`, `graphify-out/`, `models/`

```
scan2text/
├── .dsh/
│   └── dshmm/
├── .kilo/
│   └── plans/
├── .obsidian/
│   ├── plugins/ (dataview, notebook-navigator, obsidian-kanban)
│   └── themes/ (AnuPpuccin)
├── .pytest_cache/
│   └── v/cache/
├── .scan2text/
│   ├── assets/
│   ├── feedback/ (pending/, sent/)
│   ├── logs/
│   ├── output/
│   └── settings/
├── .vscode/
├── backend/
├── build/
│   ├── scan2text-backend/ (localpycs/)
│   └── scan2text-backend-console-diag/ (localpycs/)
├── frontend/
│   ├── Images/
│   ├── public/
│   ├── scripts/
│   ├── src/
│   │   ├── __tests__/
│   │   ├── assets/ (fonts/)
│   │   ├── components/ (dropzone/, layout/, ui/)
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── lib/
│   │   ├── locales/
│   │   ├── services/
│   │   ├── stores/
│   │   └── theme/
│   └── src-tauri/
│       ├── capabilities/
│       ├── gen/ (schemas/)
│       ├── icons/
│       ├── src/
│       └── tests/
├── packaging/
│   └── build/ (scan2text-backend/localpycs/)
├── scripts/
├── second-brain/
│   ├── 00-Inbox/ (backups/)
│   ├── 01-Agent-Memory/ (Archive/, Phase-2…Phase-11/)
│   ├── 02-qa/ (phase-7/)
│   ├── 03-Architecture/ (ADRs/)
│   ├── 04-Product/
│   └── 05-Sprints/
├── src/
│   └── scan2text/
│       ├── adapters/
│       ├── api/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── ui/ (static/)
│       └── utils/
├── standards/
│   ├── architecture/
│   ├── design/
│   ├── devops/
│   ├── engineering/
│   ├── product/
│   ├── security/
│   └── testing/
├── tests/
│   ├── fakes/
│   ├── integration/
│   └── unit/ (adapters/, services/, utils/)
├── tmp-test2/
├── tools/
└── uploads/
```

---

## c. Large Tracked Files (>100 KB)

| File | Size (bytes) |
|------|-------------|
| `tools/gdrive_probe.bin` | 928,451 |
| `tools/gdrive_probe2.bin` | 929,811 |
| `frontend/package-lock.json` | 234,561 |
| `frontend/src-tauri/gen/schemas/desktop-schema.json` | 116,888 |
| `frontend/src-tauri/gen/schemas/windows-schema.json` | 116,888 |
| `frontend/src-tauri/Cargo.lock` | 111,593 |

**Total: 6 files over 100 KB.**

---

## d. Duplicate-Name Files (Same Basename, Different Paths)

| Filename | Count | Paths |
|----------|-------|-------|
| `__init__.py` | 11 | `src/scan2text/adapters/__init__.py`, `src/scan2text/api/__init__.py`, `src/scan2text/models/__init__.py`, `src/scan2text/routes/__init__.py`, `src/scan2text/services/__init__.py`, `src/scan2text/utils/__init__.py`, `tests/fakes/__init__.py`, `tests/integration/__init__.py`, `tests/unit/adapters/__init__.py`, `tests/unit/services/__init__.py`, `tests/unit/utils/__init__.py` |
| `.gitignore` | 2 | `.gitignore`, `frontend/.gitignore` |
| `index.html` | 2 | `frontend/index.html`, `src/scan2text/ui/static/index.html` |
| `README.md` | 2 | `README.md`, `frontend/README.md` |
| `settings.py` | 2 | `src/scan2text/models/settings.py`, `src/scan2text/routes/settings.py` |
| `test_queue_service.py` | 2 | `tests/integration/test_queue_service.py`, `tests/unit/services/test_queue_service.py` |
| `Untitled.md` | 2 | `second-brain/01-Agent-Memory/Phase-6/Untitled.md`, `second-brain/02-qa/Untitled.md` |

**Total: 7 duplicate basenames.**

---

## e. Frontend Dependencies (package.json)

### Production Dependencies (21)

| Package | Version Range |
|---------|--------------|
| `@radix-ui/react-dialog` | ^1.1.23 |
| `@radix-ui/react-label` | ^2.1.15 |
| `@radix-ui/react-scroll-area` | ^1.2.18 |
| `@radix-ui/react-slot` | ^1.3.3 |
| `@radix-ui/react-tooltip` | ^1.2.16 |
| `@tauri-apps/api` | ^2.11.1 |
| `autoprefixer` | ^10.5.4 |
| `class-variance-authority` | ^0.7.1 |
| `clsx` | ^2.1.1 |
| `i18next` | ^26.3.6 |
| `lucide-react` | ^1.28.0 |
| `react` | ^19.2.8 |
| `react-dom` | ^19.2.8 |
| `react-i18next` | ^17.0.11 |
| `react-markdown` | ^10.1.0 |
| `remark-gfm` | ^4.0.1 |
| `sonner` | ^2.0.7 |
| `tailwind-merge` | ^3.6.0 |
| `tailwindcss` | ^3.4.19 |
| `zustand` | ^5.0.14 |

### Dev Dependencies (14)

| Package | Version Range |
|---------|--------------|
| `@tailwindcss/typography` | ^0.5.16 |
| `@tauri-apps/cli` | ^2.11.4 |
| `@testing-library/dom` | ^10.4.1 |
| `@testing-library/jest-dom` | ^7.0.0 |
| `@testing-library/react` | ^16.3.2 |
| `@testing-library/user-event` | ^14.6.3 |
| `@types/node` | ^24.13.3 |
| `@types/react` | ^19.2.17 |
| `@types/react-dom` | ^19.2.3 |
| `@vitejs/plugin-react` | ^6.0.4 |
| `@vitest/coverage-v8` | ^4.1.10 |
| `jsdom` | ^30.0.1 |
| `oxlint` | ^1.75.0 |
| `typescript` | ~6.0.2 |
| `vite` | ^8.2.0 |
| `vitest` | ^4.1.10 |

---

## f. Python Dependencies

### From pyproject.toml (production)

| Package | Version Constraint |
|---------|-------------------|
| fastapi | >=0.115 |
| uvicorn[standard] | >=0.34 |
| pydantic | >=2.9 |
| python-multipart | >=0.0.9 |
| llama-cpp-python | >=0.3.7, <0.4 |
| pypdfium2 | >=4.30 |
| pillow | >=10.0 |
| pywebview | >=5.2 |
| requests | >=2.32 |
| click | >=8.1 |
| psutil | >=6.0 |

### From pyproject.toml (dev)

| Package | Version Constraint |
|---------|-------------------|
| pytest | >=8.3 |
| httpx | >=0.28 |
| pytest-asyncio | >=0.24 |
| pyinstaller | >=6.10 |

### Resolved versions (pip freeze, filtered)

| Package | Resolved Version |
|---------|-----------------|
| fastapi | 0.141.1 |
| pydantic | 2.13.4 |
| pydantic_core | 2.46.4 |
| pyinstaller | 6.22.0 |
| pyinstaller-hooks-contrib | 2026.6 |
| pypdfium2 | 5.12.1 |
| python-multipart | 0.0.32 |
| uvicorn | 0.52.0 |

---

## g. Frontend Import Census (Top Modules by Frequency)

**Total import lines: 74 | Distinct imported modules: 38**

| Module | Count |
|--------|-------|
| vitest | 21 |
| ../i18n | 3 |
| sonner | 3 |
| @testing-library/react | 3 |
| ./apiBase | 3 |
| zustand | 3 |
| react-i18next | 2 |
| react | 2 |
| @/lib/apiBase | 2 |
| @/i18n | 2 |
| ../stores/fileStore | 2 |
| ./api | 1 |
| tailwind-merge | 1 |
| ../lib/api | 1 |
| path | 1 |
| i18next | 1 |
| fs | 1 |
| clsx | 1 |
| ../lib/progressManager | 1 |
| @tauri-apps/api/event | 1 |
| @/locales/id.json | 1 |
| @/locales/en.json | 1 |
| @/components/layout/WelcomeModal | 1 |
| ./useProgressSocket | 1 |
| ../locales/en.json | 1 |
| ./uploadService | 1 |
| ./scan2text.store | 1 |
| ./progressManager | 1 |
| ./preferencesStore | 1 |
| ./naming | 1 |
| ./formatBytes | 1 |
| ./fileValidation | 1 |
| ./fileStore | 1 |
| ./fileKind | 1 |
| ./depthStyles | 1 |
| ./cleanupObjectURLs | 1 |
| ../locales/id.json | 1 |
| @/components/layout/panels/QueuePanel | 1 |

---

## h. Backend Import Census (Top-Level Module Names)

**Source:** `src/scan2text/**/*.py`

| Top-Level Module | Count |
|-----------------|-------|
| scan2text | 56 |
| __future__ | 28 |
| typing | 20 |
| logging | 16 |
| pathlib | 15 |
| pydantic | 8 |
| fastapi | 8 |
| datetime | 6 |
| json | 5 |
| os | 5 |
| uuid | 3 |
| re | 3 |
| pypdfium2 | 2 |
| urllib | 2 |
| enum | 2 |
| sys | 2 |
| asyncio | 2 |
| psutil | 2 |
| abc | 1 |
| threading | 1 |
| requests | 1 |
| io | 1 |
| html | 1 |
| base64 | 1 |
| PIL | 1 |
| contextlib | 1 |
| multiprocessing | 1 |
| math | 1 |
| hashlib | 1 |
| queue | 1 |
| zipfile | 1 |

---

## i. Rust/Tauri Dependencies (Cargo.toml)

### Runtime Dependencies

| Package | Version | Features |
|---------|---------|----------|
| tauri | 2.11.3 | [] |
| tauri-plugin-log | 2 | — |
| serde | 1 | ["derive"] |
| serde_json | 1 | — |
| log | 0.4 | — |

### Build Dependencies

| Package | Version | Features |
|---------|---------|----------|
| tauri-build | 2.6.3 | [] |

---

## j. Test Inventory

| Category | Count |
|----------|-------|
| Python test files (`tests/**/*.py`) | **53** |
| TypeScript/TSX test files (`frontend/src/**/*.test.tsx`) | **19** |
| TypeScript test files (`frontend/src/**/*.test.ts`) | **20** |
| **Total test files** | **92** |

---

## k. .gitignore — Full Content

```
node_modules/
dist/
build/
*.tsbuildinfo
*.egg-info/
/models/
*.gguf
output/
logs/
settings/
*.log
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/
.obsidian/
.DS_Store
target/
Thumbs.db
.env
.env.local

# Python
backend/.venv/
.vite
__pycache__/
*.pyc
.vite-temp/
.tmp/

# Local test material — never commit real documents
samples/

# Privacy / runtime artifacts — never commit
uploads/
.scan2text/
graphify-out/
src/graphify-out/
.kilo/
*.log.txt
```

---

## l. Graphify Analysis (code-only, incremental)

**Run:** `graphify . --code-only`  
**Status:** Ran successfully (exit code 0)

### Summary Statistics

| Metric | Value |
|--------|-------|
| Nodes | 2,173 |
| Edges | 3,292 |
| Communities | 193 (172 shown, 21 thin omitted) |
| Extraction quality | 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS |
| Token cost | 8,500 input · 380 output |
| Files classified | 242 · ~114,792 words |

### God Nodes (most connected)

1. `PathService` — 207 edges
2. `OutputService` — 61 edges
3. `FileService` — 53 edges
4. `QueueService` — 49 edges
5. `VlmOcrAdapter` — 42 edges
6. `SettingsService` — 42 edges
7. `ModelDownloaderService` — 35 edges
8. `FeedbackService` — 27 edges
9. `OCREngine` — 24 edges
10. `FakeOCR` — 24 edges

### Import Cycles

None detected.

---

## Appendix: Folder Casing Finding

Actual folder names under `second-brain/`:

```
00-Inbox
01-Agent-Memory
02-qa          ← lowercase "qa" (NOT "02-QA")
03-Architecture
04-Product
05-Sprints
00-Current-State.md
```

**Finding:** The QA directory is named `02-qa` (lowercase), not `02-QA`. No renaming performed per instructions.

---

*End of fact pack. Document created 2026-08-23 for external audit review.*
