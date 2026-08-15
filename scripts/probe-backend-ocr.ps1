#
# .SYNOPSIS
#     Probe the Scan2Text backend OCR pipeline end-to-end.
#     Stops backend, restarts with log redirection, sends an image, polls status.
#
# .DESCRIPTION
#     Authoritative slice: S10-PROBE-FIX2-Rewrite-With-ByteProof.
#     CEO runs this - Kilo does NOT execute (AGENTS.md 3.8).
#
#     Source of truth for API contract (src/scan2text/api/main.py):
#       POST /process  -> multipart/form-data, field "files"
#                         returns task_id JSON
#       GET  /status/<task_id>
#             -> task_id, status: queued/processing/completed/failed,
#                  processed, total, result_markdown
#       GET  /api/health
#             -> status, worker, ram, model, version
#
# .PARAMETER ImagePath
#     Full path to a single image file (PNG/JPG/JPEG/WEBP).
#     If omitted, auto-picks the newest image from Desktop and Downloads.
#
param($ImagePath)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Error.Clear()

# Paths
$BackendExe   = "D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe"
$LogsDir      = "D:\Scan2Text\logs"
$OutLog       = Join-Path $LogsDir "probe-out.log"
$ErrLog       = Join-Path $LogsDir "probe-err.log"
$Port         = 47351
$ApiBase      = "http://127.0.0.1:47351"
$MaxStatusSec = 120
$StatusPollMs = 2000

# Pre-flight
if (-not (Test-Path $BackendExe)) {
    Write-Error "Backend executable not found: $BackendExe"
    exit 1
}

New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null

# Step A: Free port 47351
Write-Host "PROBE: Stopping any running backend ..." -ForegroundColor Cyan
Get-Process -Name scan2text-backend -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step B: Pick image
if (-not $ImagePath -or $ImagePath.Trim() -eq "") {
    Write-Host "PROBE: No -ImagePath provided; auto-picking newest image ..." -ForegroundColor Cyan
    $Candidates = Get-ChildItem -Path $env:USERPROFILE\Desktop, $env:USERPROFILE\Downloads -File -Recurse -Include *.png,*.jpg,*.jpeg,*.webp -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending |
                  Select-Object -First 1
    if (-not $Candidates) {
        Write-Error "No PNG/JPG/JPEG/WEBP image found on Desktop or Downloads."
        exit 2
    }
    $ImagePath = $Candidates.FullName
    Write-Host "PROBE: Auto-picked: $ImagePath" -ForegroundColor Yellow
}

if (-not (Test-Path $ImagePath)) {
    Write-Error "Image not found: $ImagePath"
    exit 2
}

# Step C: Start backend with log redirection
Write-Host "PROBE: Starting backend (redirecting stdout/stderr to $LogsDir) ..." -ForegroundColor Cyan
$Proc = Start-Process -FilePath $BackendExe `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -PassThru -NoNewWindow

Write-Host "PROBE: Backend PID $($Proc.Id); log files: $OutLog  $ErrLog" -ForegroundColor Cyan

# Step D: Wait for port 47351
Write-Host "PROBE: Waiting for port $Port ..." -ForegroundColor Cyan
$tcp = New-Object System.Net.Sockets.TcpClient
$start = Get-Date
while ((Get-Date) -lt $start.AddSeconds(30)) {
    try {
        $result = $tcp.ConnectAsync("127.0.0.1", $Port)
        $result.AsyncWaitHandle.WaitOne(1500) | Out-Null
        if ($tcp.Connected) { break }
    } catch {
        # connection refused or timeout - keep trying
    }
}
$tcp.Close()

if (-not $tcp.Connected) {
    Write-Error "Port $Port not reachable after 30s. Backend may have crashed."
    Write-Host "PROBE: STDERR log:" -ForegroundColor Red
    Get-Content $ErrLog -ErrorAction SilentlyContinue
    Write-Host "PROBE: STDOUT log:" -ForegroundColor Red
    Get-Content $OutLog -ErrorAction SilentlyContinue
    exit 3
}

# Wait for HTTP readiness via /api/health
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "$ApiBase/api/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "PROBE: /api/health OK -- $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
        $ready = $true
        break
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

if (-not $ready) {
    Write-Error "/api/health never responded. Backend may be broken."
    Write-Host "PROBE: STDERR log:" -ForegroundColor Red
    Get-Content $ErrLog -ErrorAction SilentlyContinue
    Write-Host "PROBE: STDOUT log:" -ForegroundColor Red
    Get-Content $OutLog -ErrorAction SilentlyContinue
    exit 4
}

# Step E: POST image to /process
Write-Host "PROBE: POST /process with $ImagePath ..." -ForegroundColor Cyan
$fileBytes = Get-Content $ImagePath -Encoding Byte

$randomPart = (Get-Random -Maximum 99999999).ToString("D8")
$boundary = "----ProbeBoundary" + $randomPart
$utf8 = New-Object System.Text.UTF8Encoding($false)
$postData = New-Object System.IO.MemoryStream

# form-header
$leafName = Split-Path $ImagePath -Leaf
$headerLine = "--{0}`r`nContent-Disposition: form-data; name=""files""; filename=""{1}""`r`nContent-Type: application/octet-stream`r`n`r`n" -f $boundary, $leafName
$headerBytes = $utf8.GetBytes($headerLine)
$postData.Write($headerBytes, 0, $headerBytes.Length)

# file body
$postData.Write($fileBytes, 0, $fileBytes.Length)

# trailing boundary
$trailerBytes = $utf8.GetBytes("`r`n--{0}--`r`n" -f $boundary)
$postData.Write($trailerBytes, 0, $trailerBytes.Length)

$postData.Seek(0, "Begin") | Out-Null
$bodyBytes = $postData.ToArray()
$postData.Close()

try {
    $resp = Invoke-WebRequest -Uri "$ApiBase/process" -Method POST -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyBytes -ErrorAction Stop
    $body = $resp.Content
} catch {
    Write-Error "POST /process failed: $($_.Exception.Message)"
    exit 5
}

$task = $body | ConvertFrom-Json
$taskId = $task.task_id
Write-Host "PROBE: Task ID: $taskId" -ForegroundColor Green

# Step F: Poll GET /status/<task_id>
Write-Host "PROBE: Polling /status/$taskId (timeout ${MaxStatusSec}s) ..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds($MaxStatusSec)
$status = "pending"

while ((Get-Date) -lt $deadline -and $status -ne "completed" -and $status -ne "failed") {
    Start-Sleep -Milliseconds $StatusPollMs

    try {
        $st = Invoke-RestMethod -Uri "$ApiBase/status/$taskId" -TimeoutSec 5 -ErrorAction Stop
        $status = $st.status
        $p = if ($st.processed -ne $null) { $st.processed } else { "?" }
        $t = if ($st.total -ne $null) { $st.total } else { "?" }
        Write-Host "PROBE:  $status processed=$p / total=$t" -ForegroundColor Yellow
    } catch {
        Write-Warning "Status poll error: $($_.Exception.Message)"
        $status = "error_poll"
    }
}

# Step G: Report
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "           PROBE RESULTS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if ($status -eq "completed") {
    Write-Host "OK: Task completed." -ForegroundColor Green
    if ($st.result_markdown) {
        Write-Host "Markdown output (first 500 chars):" -ForegroundColor Green
        $mdLen = $st.result_markdown.Length
        if ($mdLen -gt 500) { $mdLen = 500 }
        Write-Host $st.result_markdown.Substring(0, $mdLen)
    }
} elseif ($status -eq "failed") {
    Write-Host "FAIL: Task status=failed." -ForegroundColor Red
    Write-Host "PROBE: STDERR log:" -ForegroundColor Red
    Get-Content $ErrLog -ErrorAction SilentlyContinue
    Write-Host "PROBE: STDOUT log:" -ForegroundColor Red
    Get-Content $OutLog -ErrorAction SilentlyContinue
} else {
    Write-Host "TIMEOUT: Status never reached completed/failed in ${MaxStatusSec}s." -ForegroundColor Red
    Write-Host "PROBE: Last known status: $status" -ForegroundColor Red
    Write-Host "PROBE: STDERR log:" -ForegroundColor Red
    Get-Content $ErrLog -ErrorAction SilentlyContinue
    Write-Host "PROBE: STDOUT log:" -ForegroundColor Red
    Get-Content $OutLog -ErrorAction SilentlyContinue
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log files:" -ForegroundColor Cyan
Write-Host "  STDOUT: $OutLog"
Write-Host "  STDERR: $ErrLog"
Write-Host ""
Write-Host "To inspect manually:" -ForegroundColor Cyan
Write-Host "  Get-Content $ErrLog"
Write-Host "  Get-Content $OutLog"
Write-Host ""
