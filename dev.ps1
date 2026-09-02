$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = $scriptDir
$frontendDir = Join-Path $repoRoot "frontend"
$backendSrc = Join-Path $repoRoot "src"
$port = 47351

Write-Host "=== Scan2Text Dev Mode (unified port $port) ===" -ForegroundColor Cyan
Write-Host "Repo root : $repoRoot"
Write-Host "Frontend  : $frontendDir"
Write-Host "Backend   : $backendSrc"
Write-Host ""

# ── Port-occupancy safety belt ────────────────────────────────────────────────
$occupied = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
    $tcp.Close()
    $occupied = $true
} catch {
    # Port is free — proceed
}

if ($occupied) {
    Write-Error "Port $port is already occupied. Another process is listening on 127.0.0.1:$port. Kill it and retry."
    exit 1
}

# ── Boot backend in background ────────────────────────────────────────────────
$env:PYTHONPATH = $backendSrc
$backendProc = Start-Process -FilePath "py" -ArgumentList "-3.12", "-m", "uvicorn", "scan2text.api.main:app", "--host", "127.0.0.1", "--port", $port.ToString(), "--log-level", "warning" `
    -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden

Write-Host "Backend (Uvicorn) started [PID $($backendProc.Id)] on http://127.0.0.1:$port" -ForegroundColor Green

# ── Health-wait: poll /health up to 30 s ─────────────────────────────────────
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $healthy = $true
            Write-Host "Backend healthy after $($i + 1)s" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "Waiting for backend … ($($i + 1)/30)" -ForegroundColor Yellow
    }
}

if (-not $healthy) {
    Write-Error "Backend did not become healthy within 30 s. Check logs."
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# ── Launch Tauri dev ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting Tauri dev mode…" -ForegroundColor Yellow
Set-Location $frontendDir

# Exit trap: kill backend process tree on any exit
$script:backendPid = $backendProc.Id
trap {
    Write-Host "`nShutting down backend (PID $script:backendPid) …" -ForegroundColor Gray
    Stop-Process -Id $script:backendPid -Force -ErrorAction SilentlyContinue
    # Also kill any child uvicorn processes
    Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne [System.Diagnostics.Process]::GetCurrentProcess().Id } | Stop-Process -Force -ErrorAction SilentlyContinue
    exit $LASTEXITCODE
}

npx tauri dev
