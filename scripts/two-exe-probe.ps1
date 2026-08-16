#
# Two-EXE forensics probe v2 - repo build vs portable build.
# Stops backends, runs each exe headless, captures stdout and
# stderr to SEPARATE files, prints first 15 lines of each.
# ASCII only. Zero square brackets. PowerShell 5.1 safe.
# v2 fixes: dropped -WindowStyle (illegal with -NoNewWindow);
# split stdout/stderr into separate files (same-file is illegal).
# Cloud CTO correction pass. CEO runs only.
#
param(
    $RepoExe = "D:\WingAI\Projects\scan2text\dist\scan2text-backend\scan2text-backend.exe",
    $PortableExe = "D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe",
    $OutDir = "D:\WingAI\Projects\scan2text\scripts"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoOutLog = Join-Path $OutDir "repo-exe-out.log"
$RepoErrLog = Join-Path $OutDir "repo-exe-err.log"
$PortOutLog = Join-Path $OutDir "portable-exe-out.log"
$PortErrLog = Join-Path $OutDir "portable-exe-err.log"
$MaxLines   = 15
$TimeoutSec = 20

function Print-Log {
    param($Title, $Path)
    Write-Host ""
    Write-Host "=== $Title (first $MaxLines lines) ===" -ForegroundColor Cyan
    if (Test-Path $Path) {
        $arr = @(Get-Content $Path -TotalCount $MaxLines)
        if ($arr.Count -eq 0) {
            Write-Host "(empty log)" -ForegroundColor Gray
        } else {
            $arr | ForEach-Object { Write-Host $_ }
        }
    } else {
        Write-Host "(log file missing)" -ForegroundColor Red
    }
}

Write-Host "=== Two-EXE Forensics Probe v2 ===" -ForegroundColor Cyan

Write-Host "1/6 Stopping all scan2text-backend processes ..." -ForegroundColor Yellow
Get-Process -Name scan2text-backend -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

Write-Host "2/6 Running repo exe headless ..." -ForegroundColor Yellow
$null = New-Item -ItemType Directory -Path $OutDir -Force -ErrorAction SilentlyContinue
try {
    $proc = Start-Process -FilePath $RepoExe `
        -RedirectStandardOutput $RepoOutLog `
        -RedirectStandardError $RepoErrLog `
        -PassThru -NoNewWindow
    Start-Sleep -Seconds $TimeoutSec
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    Write-Host "  Repo exe stopped." -ForegroundColor Green
} catch {
    Write-Host "  Repo exe error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "3/6 Running portable exe headless ..." -ForegroundColor Yellow
try {
    $proc2 = Start-Process -FilePath $PortableExe `
        -RedirectStandardOutput $PortOutLog `
        -RedirectStandardError $PortErrLog `
        -PassThru -NoNewWindow
    Start-Sleep -Seconds $TimeoutSec
    if ($proc2 -and -not $proc2.HasExited) {
        Stop-Process -Id $proc2.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    Write-Host "  Portable exe stopped." -ForegroundColor Green
} catch {
    Write-Host "  Portable exe error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "4/6 Final cleanup ..." -ForegroundColor Yellow
Get-Process -Name scan2text-backend -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "5/6 Repo logs:" -ForegroundColor Yellow
Print-Log "Repo EXE stderr" $RepoErrLog
Print-Log "Repo EXE stdout" $RepoOutLog

Write-Host "6/6 Portable logs:" -ForegroundColor Yellow
Print-Log "Portable EXE stderr" $PortErrLog
Print-Log "Portable EXE stdout" $PortOutLog

Write-Host ""
Write-Host "=== Probe Complete ===" -ForegroundColor Cyan