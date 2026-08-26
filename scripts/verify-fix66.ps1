# S11-FIX66-DEPLOY-Backend-Swap — verify-fix66.ps1
# Verifies deployed backend matches FIX66 SHA256 and required DLLs.

$ErrorActionPreference = "Stop"

$EXPECTED_HASH = "26F5ECFF904B53ED028C3932706AD3A473F573CCC987D44468F020DFF627EE5B"
$backendDir    = "D:\Scan2Text\backend"
$overallPass   = $true

Write-Host "========================================"
Write-Host "  FIX66 VERIFICATION"
Write-Host "========================================"
Write-Host ""

# ── a. SHA256 check ─────────────────────────────────────────────────────────
$exePath = Join-Path $backendDir "scan2text-backend.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "[FAIL] scan2text-backend.exe not found at $exePath"
    $overallPass = $false
}
else {
    $hashObj = Get-FileHash -Path $exePath -Algorithm SHA256
    $actual  = $hashObj.Hash.ToUpper()
    Write-Host "[HASH] Actual  : $actual"
    Write-Host "[HASH] Expected: $EXPECTED_HASH"
    if ($actual -eq $EXPECTED_HASH) {
        Write-Host "[PASS] SHA256 matches FIX66."
    }
    else {
        Write-Host "[FAIL] SHA256 MISMATCH — deploy may be stale or corrupted."
        $overallPass = $false
    }
}

# ── b. python312.dll ────────────────────────────────────────────────────────
$pyDll = Join-Path $backendDir "_internal\python312.dll"
if (Test-Path $pyDll) {
    $pySize = [math]::Round((Get-Item $pyDll).Length / 1MB, 2)
    Write-Host "[PASS] python312.dll present  ($pySize MB)"
}
else {
    Write-Host "[FAIL] python312.dll MISSING at $pyDll"
    $overallPass = $false
}

# ── c. pdfium.dll ───────────────────────────────────────────────────────────
$pdfiumDll = Join-Path $backendDir "_internal\pypdfium2_raw\pdfium.dll"
if (Test-Path $pdfiumDll) {
    $pdfiumSize = [math]::Round((Get-Item $pdfiumDll).Length / 1MB, 2)
    Write-Host "[PASS] pdfium.dll present     ($pdfiumSize MB)"
}
else {
    Write-Host "[FAIL] pdfium.dll MISSING at $pdfiumDll"
    $overallPass = $false
}

# ── Overall ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================"
if ($overallPass) {
    Write-Host "  RESULT: ALL CHECKS PASSED"
    Write-Host "  Backend is ready for boot smoke test."
}
else {
    Write-Host "  RESULT: ONE OR MORE CHECKS FAILED"
    Write-Host "  Re-run deploy-fix66.ps1 and verify again."
}
Write-Host "========================================"
