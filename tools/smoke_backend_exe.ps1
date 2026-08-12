# smoke_backend_exe.ps1
# Smoke test for the frozen Scan2Text backend executable.
# Starts dist/scan2text-backend/scan2text-backend.exe, polls health + download/status, then stops.

$ErrorActionPreference = "Stop"

$exePath = Join-Path $PSScriptRoot "..\dist\scan2text-backend\scan2text-backend.exe"
$port = 47351
$healthUrl = "http://127.0.0.1:$port/api/health"
$downloadUrl = "http://127.0.0.1:$port/api/download/status"
$timeoutSec = 30
$pollIntervalMs = 500

if (-not (Test-Path $exePath)) {
    Write-Host "FAIL: exe not found at $exePath" -ForegroundColor Red
    exit 1
}

# Check if port is already occupied
try {
    $listener = New-Object System.Net.Sockets.TcpListener "127.0.0.1", $port
    $listener.Start()
    $listener.Stop()
    Write-Host "Port $port is free." -ForegroundColor Green
} catch {
    Write-Host "BLOCKED: Port $port is already in use." -ForegroundColor Red
    exit 2
}

$process = $null
try {
    Write-Host "Starting $exePath ..." -ForegroundColor Cyan
    $process = Start-Process -FilePath $exePath -PassThru -WindowStyle Hidden

    Write-Host "PID: $($process.Id)" -ForegroundColor Yellow
    Write-Host "Polling $healthUrl for up to ${timeoutSec}s ..." -ForegroundColor Cyan

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ready = $false
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            $r = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 -ErrorAction Stop
            if ($r.status -eq "ok") {
                Write-Host "Health OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds $pollIntervalMs
        }
    }
    $sw.Stop()

    if (-not $ready) {
        Write-Host "FAIL: backend did not become ready within ${timeoutSec}s" -ForegroundColor Red
        exit 3
    }

    # Test download/status endpoint
    try {
        $dr = Invoke-RestMethod -Uri $downloadUrl -TimeoutSec 5 -ErrorAction Stop
        Write-Host "Download status OK: $($dr | ConvertTo-Json -Compress)" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: GET /api/download/status failed: $_" -ForegroundColor Red
        exit 4
    }

    Write-Host "Smoke test PASSED." -ForegroundColor Green
} finally {
    if ($process -and -not $process.HasExited) {
        Write-Host "Stopping backend process (PID $($process.Id)) ..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}
