<#
.SYNOPSIS
    Package Scan2Text portable ZIPs (Thin + Full).
.DESCRIPTION
    Builds frontend + Tauri shell, then generates two portable ZIP artifacts:
    - Scan2Text-v1.1-Portable.zip (Thin, excludes models/, ~81 MB)
    - Scan2Text-v1.1-Portable-Full.zip (Full, includes models/, ~1.1 GB)
    Both ZIPs include version.json at the portable root (required by ModelDownloaderService).
    Both ZIPs exclude logs/, output/, feedback/ (created empty).
.NOTES
    Run from repo root. PowerShell 5.1+. CEO-locked: PowerShell only.
#>

[CmdletBinding()]
param(
    [string]$Version = "v1.1",
    [switch]$SkipBuild,
    [string]$OutputDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$StagingDir = Join-Path $RepoRoot ".staging-portable"
$ThinZipName = "Scan2Text-${Version}-Portable.zip"
$FullZipName = "Scan2Text-${Version}-Portable-Full.zip"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Scan2Text Portable Packaging" -ForegroundColor Cyan
Write-Host "  Version: $Version" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1. Build frontend + Tauri shell (unless skipped)
# ------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Host "[BUILD] Frontend + Tauri shell..." -ForegroundColor Yellow

    # Frontend build
    Set-Location (Join-Path $RepoRoot "frontend")
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Frontend build failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Frontend build success." -ForegroundColor Green

    # Tauri build
    npx tauri build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Tauri build failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Tauri build success." -ForegroundColor Green

    Set-Location $RepoRoot
} else {
    Write-Host "[SKIP] Build step skipped per -SkipBuild." -ForegroundColor Gray
}

# ------------------------------------------------------------------
# 2. Locate artifacts
# ------------------------------------------------------------------
$ExePath = Join-Path $RepoRoot "frontend\src-tauri\target\release\Scan2Text.exe"
$BackendPath = Join-Path $RepoRoot "backend"

if (-not (Test-Path $ExePath)) {
    Write-Host "[FAIL] Scan2Text.exe not found at $ExePath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $BackendPath)) {
    Write-Host "[FAIL] backend/ not found at $BackendPath" -ForegroundColor Red
    exit 1
}

$ExeSizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 2)
Write-Host "[FOUND] Scan2Text.exe = $ExeSizeMB MB" -ForegroundColor Green
Write-Host "[FOUND] backend/ = $BackendPath" -ForegroundColor Green

# ------------------------------------------------------------------
# 3. Prepare staging directory
# ------------------------------------------------------------------
if (Test-Path $StagingDir) {
    Write-Host "[CLEAN] Removing old staging dir..." -ForegroundColor Gray
    Remove-Item -LiteralPath $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Copy Scan2Text.exe
Write-Host "[COPY] Scan2Text.exe -> staging..." -ForegroundColor Gray
Copy-Item -Path $ExePath -Destination $StagingDir -Force

# Copy backend/ contents (NOT the folder wrapper)
Write-Host "[COPY] backend/ -> staging..." -ForegroundColor Gray
New-Item -ItemType Directory -Path (Join-Path $StagingDir "backend") -Force | Out-Null
Copy-Item -Path "$BackendPath\*" -Destination (Join-Path $StagingDir "backend") -Recurse -Force

# Copy version.json (required by ModelDownloaderService at portable root)
Write-Host "[COPY] version.json -> staging..." -ForegroundColor Gray
Copy-Item -Path (Join-Path $RepoRoot "version.json") -Destination $StagingDir -Force

# Copy models/ (included in Full ZIP, excluded from Thin ZIP via filter)
Write-Host "[COPY] models/ -> staging..." -ForegroundColor Gray
New-Item -ItemType Directory -Path (Join-Path $StagingDir "models") -Force | Out-Null
Copy-Item -Path "$RepoRoot\models\*" -Destination (Join-Path $StagingDir "models") -Recurse -Force

# Create empty runtime directories
@("logs", "output", "feedback") | ForEach-Object {
    New-Item -ItemType Directory -Path (Join-Path $StagingDir $_) -Force | Out-Null
    Write-Host "[MKDIR] $_/ (empty)" -ForegroundColor Gray
}

# ------------------------------------------------------------------
# 4. Generate Thin ZIP (exclude models/)
# ------------------------------------------------------------------
Write-Host "`n[PACK] Generating Thin ZIP: $ThinZipName" -ForegroundColor Yellow

$ThinZipPath = Join-Path $OutputDir $ThinZipName
if (Test-Path $ThinZipPath) {
    Remove-Item -LiteralPath $ThinZipPath -Force
}

# Use Compress-Archive (PowerShell built-in, no type references needed)
# Create temp dir, copy excluding models/, compress, cleanup
$ThinTempDir = Join-Path $RepoRoot ".staging-thin-temp"
if (Test-Path $ThinTempDir) {
    Remove-Item -LiteralPath $ThinTempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ThinTempDir -Force | Out-Null

# Copy everything except models/
Get-ChildItem -Path $StagingDir -Recurse | Where-Object {
    -not $_.FullName.Contains("\models\")
} | ForEach-Object {
    if ($_.PSIsContainer) {
        $relativePath = $_.FullName.Substring($StagingDir.Length).Replace('\', '/')
        if ($relativePath.StartsWith('/')) {
            $relativePath = $relativePath.Substring(1)
        }
        $newPath = Join-Path $ThinTempDir $relativePath
        New-Item -ItemType Directory -Path $newPath -Force | Out-Null
    } else {
        $relativePath = $_.FullName.Substring($StagingDir.Length).Replace('\', '/')
        if ($relativePath.StartsWith('/')) {
            $relativePath = $relativePath.Substring(1)
        }
        $newPath = Join-Path $ThinTempDir $relativePath
        New-Item -ItemType Directory -Path (Split-Path $newPath) -Force | Out-Null
        Copy-Item -Path $_.FullName -Destination $newPath -Force
    }
}

# Compress to ZIP
Compress-Archive -Path "$ThinTempDir\*" -DestinationPath $ThinZipPath -CompressionLevel Optimal -Force

# Cleanup temp directory
Remove-Item -LiteralPath $ThinTempDir -Recurse -Force

# Count entries
$thinCount = (Get-ChildItem -Path $StagingDir -Recurse | Where-Object {
    -not $_.FullName.Contains("\models\")
}).Count

$thinSizeMB = [math]::Round((Get-Item $ThinZipPath).Length / 1MB, 2)
Write-Host "[OK] Thin ZIP: $ThinZipName ($thinSizeMB MB, $thinCount entries)" -ForegroundColor Green

# ------------------------------------------------------------------
# 5. Generate Full ZIP (include models/)
# ------------------------------------------------------------------
Write-Host "`n[PACK] Generating Full ZIP: $FullZipName" -ForegroundColor Yellow

$FullZipPath = Join-Path $OutputDir $FullZipName
if (Test-Path $FullZipPath) {
    Remove-Item -LiteralPath $FullZipPath -Force
}

# Use Compress-Archive for Full ZIP
Compress-Archive -Path "$StagingDir\*" -DestinationPath $FullZipPath -CompressionLevel Optimal -Force

# Count entries
$fullCount = (Get-ChildItem -Path $StagingDir -Recurse).Count

$fullSizeMB = [math]::Round((Get-Item $FullZipPath).Length / 1MB, 2)
Write-Host "[OK] Full ZIP: $FullZipName ($fullSizeMB MB, $fullCount entries)" -ForegroundColor Green

# ------------------------------------------------------------------
# 6. Cleanup staging
# ------------------------------------------------------------------
Write-Host "`n[CLEAN] Removing staging dir..." -ForegroundColor Gray
Remove-Item -LiteralPath $StagingDir -Recurse -Force

# ------------------------------------------------------------------
# 7. Summary
# ------------------------------------------------------------------
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PACKAGING COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Thin : $ThinZipName ($thinSizeMB MB)" -ForegroundColor Green
Write-Host "  Full : $FullZipName ($fullSizeMB MB)" -ForegroundColor Green
Write-Host "  Location: $OutputDir" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

exit 0
