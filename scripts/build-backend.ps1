$ErrorActionPreference = "Stop"
$RepoRoot = "D:\WingAI\Projects\scan2text"
Set-Location "$RepoRoot\packaging"
$specPath = "scan2text-backend.spec"
$srcPath = "$RepoRoot\src"
$content = Get-Content $specPath -Raw
$content = $content -replace 'pathex=\[\]', "pathex=['$srcPath']"
Set-Content $specPath $content -NoNewline
py -3.12 -m PyInstaller $specPath --clean --noconfirm *> build-14.log
Write-Host "EXIT:$LASTEXITCODE"
Get-Content build-14.log | Select-Object -Last 10
Select-String -Path build-14.log -Pattern "scan2text" | Select-Object -First 5

# Copy PyInstaller output to repo-root backend/ (per BUILD-PIPELINE.md)
$DistOutput = Join-Path "dist" "scan2text-backend"
$TargetBackend = Join-Path $RepoRoot "backend"
if (Test-Path $DistOutput) {
    if (Test-Path $TargetBackend) {
        Remove-Item -LiteralPath $TargetBackend -Recurse -Force
    }
    Copy-Item -Path $DistOutput -Destination $TargetBackend -Recurse -Force
    Write-Host "[COPY] PyInstaller output -> $TargetBackend" -ForegroundColor Green
} else {
    Write-Host "[FAIL] PyInstaller output not found at $DistOutput" -ForegroundColor Red
    exit 1
}
