# S11-FIX66-DEPLOY-Backend-Swap — deploy-fix66.ps1
# Deploys FIX66 backend (SHA256: 26F5ECFF...) to D:\Scan2Text\backend\
# CEO-locked: D:\Scan2Text\Scan2Text.exe is NOT touched.

$ErrorActionPreference = "Stop"

# ── 1. Stop existing processes ──────────────────────────────────────────────
foreach ($proc in @("Scan2Text", "scan2text-backend")) {
    $p = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host "[STOP] Stopping $proc (PID $($p.Id))..."
        Stop-Process -InputObject $p -Force -ErrorAction SilentlyContinue
    }
    else {
        Write-Host "[STOP] $proc not running — skipping."
    }
}
Start-Sleep -Seconds 1

# ── 2. Verify source ────────────────────────────────────────────────────────
$srcDir = "D:\WingAI\Projects\scan2text\dist\scan2text-backend"
$srcExe = Join-Path $srcDir "scan2text-backend.exe"
if (-not (Test-Path $srcExe)) {
    Write-Host "[ERROR] Source not found: $srcExe"
    exit 1
}
Write-Host "[OK] Source verified: $srcExe"

# ── 3. List preserved user-data folders ─────────────────────────────────────
$userData = @(
    "D:\Scan2Text\models",
    "D:\Scan2Text\output",
    "D:\Scan2Text\settings",
    "D:\Scan2Text\logs",
    "D:\Scan2Text\feedback"
)
Write-Host "`n[KEEP] User-data folders (untouched):"
foreach ($folder in $userData) {
    if (Test-Path $folder) {
        $size = (Get-ChildItem -LiteralPath $folder -Recurse -File -ErrorAction SilentlyContinue |
                  Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host "  [KEEP] $folder  ($sizeMB MB)"
    }
    else {
        Write-Host "  [SKIP] $folder  (absent)"
    }
}

# ── 4. Remove old backend ───────────────────────────────────────────────────
$target = "D:\Scan2Text\backend"
if (Test-Path $target) {
    Write-Host "`n[REMOVE] Removing old backend at $target ..."
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Host "[OK] Old backend removed."
}
else {
    Write-Host "`n[INFO] No existing backend to remove."
}

# ── 5. Create fresh target directory ────────────────────────────────────────
New-Item -ItemType Directory -Path $target -Force | Out-Null
Write-Host "[OK] Fresh target created: $target"

# ── 6. Copy CONTENTS (NOT the folder wrapper) ───────────────────────────────
# AGENTS.md Section 13 rule: NEVER use Copy-Item -LiteralPath $src -Destination $dest -Recurse
# for a folder swap — it nests the folder. ALWAYS New-Item the target, then
# copy CONTENTS with Copy-Item -Path "$srcDir\*" -Destination $target -Recurse -Force.
Write-Host "[COPY] Copying backend contents to $target ..."
Copy-Item -Path "$srcDir\*" -Destination $target -Recurse -Force -ErrorAction Stop
Write-Host "[OK] Copy complete."

# ── 7. Summary ──────────────────────────────────────────────────────────────
$hash = Get-FileHash -Path (Join-Path $target "scan2text-backend.exe") -Algorithm SHA256
Write-Host ""
Write-Host "========================================"
Write-Host "  DEPLOY SUMMARY"
Write-Host "========================================"
Write-Host "  Source : $srcExe"
Write-Host "  Target : $target"
Write-Host "  SHA256 : $($hash.Hash)"
Write-Host "  Expected: 26F5ECFF904B53ED028C3932706AD3A473F573CCC987D44468F020DFF627EE5B"
Write-Host "========================================"
Write-Host ""
Write-Host "Next: run verify-fix66.ps1 to confirm hash + DLL presence."
