# cleanroom-boot.ps1
# Author: Kilo (Scan2Text agent)
# Purpose: Boot the NEW backend exe in isolation, dump health, then stop.
# Constraints: Zero square brackets. ASCII only. CEO-run.
# Usage: pwsh -File scripts\cleanroom-boot.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$exePath = "D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe"
$outLogPath = "D:\Scan2Text\dist\scan2text-backend\logs\cleanroom-out.log"
$errLogPath = "D:\Scan2Text\dist\scan2text-backend\logs\cleanroom-err.log"
$healthUrl = "http://127.0.0.1:47351/api/health"
$vlmPath = "D:\Scan2Text\models\vlm.gguf"
$mmprojPath = "D:\Scan2Text\models\mmproj.gguf"

Write-Host "=== Clean Room Boot ===" -ForegroundColor Cyan

# (a) Kill any lingering backend
Write-Host "(1/7) Stopping any running backend..." -ForegroundColor Yellow
Stop-Process -Name scan2text-backend -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# (b) Probe model paths
Write-Host "(2/7) Model file probe:" -ForegroundColor Yellow
$vlmExists = Test-Path $vlmPath
$mmprojExists = Test-Path $mmprojPath
Write-Host "  vlm.gguf       : " -NoNewline
Write-Host $vlmExists
Write-Host "  mmproj.gguf    : " -NoNewline
Write-Host $mmprojExists

# (c) Start backend with stdout/stderr redirected to log
Write-Host "(3/7) Starting backend (redirecting output to $outLogPath, errors to $errLogPath)..." -ForegroundColor Yellow
$process = Start-Process -FilePath $exePath `
    -RedirectStandardOutput $outLogPath `
    -RedirectStandardError $errLogPath `
    -PassThru `
    -WindowStyle Hidden

if (-not $process) {
    Write-Host "ERROR: Failed to start process" -ForegroundColor Red
    exit 1
}

Write-Host "  PID: " -NoNewline
Write-Host $process.Id

# (d) Wait for startup
Write-Host "(4/7) Waiting 25 seconds for boot..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# (e) Hit health endpoint
Write-Host "(5/7) Checking $healthUrl ..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "  Status: " -NoNewline
    Write-Host $health.StatusCode
    Write-Host "  Body: " -NoNewline
    Write-Host $health.RawContent
} catch {
    Write-Host "  Health check failed: " -NoNewline
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Also dump first 50 lines of each log so the CEO can see the actual boot output
Write-Host "(6/7) Boot output log (first 50 lines):" -ForegroundColor Yellow
if (Test-Path $outLogPath) {
    Get-Content $outLogPath -TotalCount 50
} else {
    Write-Host "MISSING" -ForegroundColor Red
}

Write-Host "(6b/7) Boot error log (first 50 lines):" -ForegroundColor Yellow
if (Test-Path $errLogPath) {
    Get-Content $errLogPath -TotalCount 50
} else {
    Write-Host "MISSING" -ForegroundColor Red
}

# (f) Stop the backend
Write-Host "(7/7) Stopping backend (PID $($process.Id))..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Write-Host "=== Done ===" -ForegroundColor Cyan
