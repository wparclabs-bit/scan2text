$ErrorActionPreference = "Stop"
Set-Location D:\WingAI\Projects\scan2text\packaging
$specPath = "scan2text-backend.spec"
$srcPath = "D:\WingAI\Projects\scan2text\src"
$content = Get-Content $specPath -Raw
$content = $content -replace 'pathex=\[\]', "pathex=['$srcPath']"
Set-Content $specPath $content -NoNewline
py -3.12 -m PyInstaller $specPath --clean --noconfirm *> build-14.log
Write-Host "EXIT:$LASTEXITCODE"
Get-Content build-14.log | Select-Object -Last 10
Select-String -Path build-14.log -Pattern "scan2text" | Select-Object -First 5
