$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = $scriptDir
$frontendDir = Join-Path $repoRoot "frontend"
$backendSrc = Join-Path $repoRoot "src"

Write-Host "=== Scan2Text Dev Mode ===" -ForegroundColor Cyan
Write-Host "Repo root : $repoRoot"
Write-Host "Frontend  : $frontendDir"
Write-Host "Backend   : $backendSrc"
Write-Host ""

# Start Uvicorn backend in a separate process
$env:PYTHONPATH = $backendSrc
$uvicornProc = Start-Process -FilePath "py" -ArgumentList "-3.12", "-m", "uvicorn", "scan2text.api.main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $repoRoot -PassThru -WindowStyle Normal
Write-Host "Backend (Uvicorn) started [PID $($uvicornProc.Id)] on http://127.0.0.1:8000" -ForegroundColor Green

# Wait briefly for backend to be ready
Start-Sleep -Seconds 2

# Start Tauri dev mode
Write-Host ""
Write-Host "Starting Tauri dev mode..." -ForegroundColor Yellow
Set-Location $frontendDir
npx tauri dev
