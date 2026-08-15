<#
.SYNOPSIS
    Health-check script for portable Scan2Text assembly.
.DESCRIPTION
    Launches Scan2Text.exe from a portable folder, waits for the embedded
    Python backend to open port 47351, then hits the /api/health endpoint.
    Kilo authors this script; CEO executes it manually (AGENTS.md 3.8).
.NOTES
    Run from any directory. PowerShell 5.1+.
#>

[CmdletBinding()]
param(
    [string]$PortablePath = "D:\Scan2Text",
    [int]$TimeoutSec = 30
)

$ErrorActionPreference = "Stop"
$Port = 47351
$HealthUrl = "http://127.0.0.1:47351/api/health"

# ------------------------------------------------------------------
# 1. Locate Scan2Text.exe
# ------------------------------------------------------------------
$ExePath = Join-Path $PortablePath "Scan2Text.exe"

if (-not (Test-Path $ExePath)) {
    Write-Host "[FAIL] Scan2Text.exe not found at $ExePath" -ForegroundColor Red
    exit 1
}

Write-Host "[FOUND] Scan2Text.exe = $ExePath" -ForegroundColor Green

# ------------------------------------------------------------------
# 2. Launch as background process, pipe stdout/stderr to log
# ------------------------------------------------------------------
$logDir = Join-Path $PortablePath "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logStdout = Join-Path $logDir "scan2text-verify-$(Get-Date -Format 'yyyyMMdd-HHmmss')-stdout.log"
$logStderr = Join-Path $logDir "scan2text-verify-$(Get-Date -Format 'yyyyMMdd-HHmmss')-stderr.log"
$LogFile = $logStdout

Write-Host "`n[LAUNCH] Starting $ExePath -> $LogFile + $logStderr" -ForegroundColor Cyan

$Process = Start-Process -FilePath $ExePath `
    -RedirectStandardOutput $logStdout `
    -RedirectStandardError $logStderr `
    -PassThru `
    -WindowStyle Hidden

if (-not $Process) {
    Write-Host "[FAIL] Start-Process returned null. Cannot launch." -ForegroundColor Red
    exit 1
}

Write-Host "[PID] $($Process.Id)" -ForegroundColor Gray

# ------------------------------------------------------------------
# 3. Wait loop - Test-NetConnection for port 47351
# ------------------------------------------------------------------
$Elapsed = 0
$Interval = 1
Write-Host "`n[WAIT] Waiting up to ${TimeoutSec}s for port $Port ..." -ForegroundColor Cyan

while ($Elapsed -lt $TimeoutSec) {
    $Result = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue 2>$null

    if ($Result.TcpTestSucceeded) {
        Write-Host "[UP] Port $Port is OPEN after ${Elapsed}s" -ForegroundColor Green
        break
    }

    Start-Sleep -Seconds $Interval
    $Elapsed += $Interval

    if ($Elapsed % 5 -eq 0) {
        Write-Host "." -NoNewline -ForegroundColor DarkGray
    }
}

if ($Elapsed -ge $TimeoutSec) {
    Write-Host "`n[FAIL] Port $Port did not open within ${TimeoutSec}s." -ForegroundColor Red
    Write-Host "  See log: $LogFile" -ForegroundColor Yellow
    Write-Host "  Kill process: Stop-Process -Id $($Process.Id) -Force" -ForegroundColor Yellow
    exit 2
}

# ------------------------------------------------------------------
# 4. Health check - GET /api/health
# ------------------------------------------------------------------
Write-Host "`n[HEALTH] GET $HealthUrl" -ForegroundColor Cyan

try {
    $Health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 10

    Write-Host "[OK] Health response:" -ForegroundColor Green
    $Health | Format-List | ForEach-Object { Write-Host $_ }

    if ($Health.status -eq "ok" -or $Health.Status -eq "ok") {
        Write-Host "[PASS] Backend reports healthy." -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Health status is not 'ok'. See details above." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "[FAIL] GET /api/health failed: $_" -ForegroundColor Red
    Write-Host "  See log: $LogFile" -ForegroundColor Yellow
    exit 3
}

Write-Host "`n[COMPLETE] Verification finished." -ForegroundColor Green
exit 0
