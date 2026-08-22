# qa-gdrive-download-test.ps1
# CEO-executed QA script — probes Google Drive direct-download URL forms for mmproj.gguf
# Kilo authored; Kilo does NOT download. CEO runs this script.
#
# For each attempt: downloads to $env:TEMP, reports HTTP status / Content-Length / actual size / GGUF magic,
# then deletes the temp file before trying the next URL.

$ErrorActionPreference = "Stop"

$fileId = "1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO"
$expectedMagic = [byte[]](0x47, 0x47, 0x55, 0x46)  # ASCII "GGUF"

$attempts = @(
    @{ Name = "Attempt 1 (share URL)";          Url = "https://drive.google.com/file/d/$fileId/view?usp=sharing" },
    @{ Name = "Attempt 2 (uc no confirm)";       Url = "https://drive.google.com/uc?export=download&id=$fileId" },
    @{ Name = "Attempt 3 (uc + confirm=t)";      Url = "https://drive.google.com/uc?export=download&confirm=t&id=$fileId" }
)

foreach ($a in $attempts) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "$($a.Name)" -ForegroundColor Cyan
    Write-Host "URL: $($a.Url)" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan

    $tempFile = Join-Path $env:TEMP ("mmproj-test-{0}.gguf" -f ([guid]::NewGuid().ToString("N")[0..7] -join ""))

    try {
        # Use Invoke-WebRequest with manual redirect following (GDrive may 302)
        $response = Invoke-WebRequest -Uri $a.Url -Method Get -MaximumRedirection 5 -UseBasicParsing -ErrorAction Stop

        $httpStatus = $response.StatusCode
        $contentLength = $null
        if ($response.Headers["Content-Length"]) {
            $contentLength = [int]$response.Headers["Content-Length"]
        }

        # Save response content to temp file
        [System.IO.File]::WriteAllBytes($tempFile, $response.Content)

        $actualSize = (Get-Item $tempFile).Length

        # Check first 4 bytes for GGUF magic
        $fileBytes = [System.IO.File]::ReadAllBytes($tempFile)
        $isGguf = $false
        if ($fileBytes.Length -ge 4) {
            $isGguf = (-not (Compare-Object $fileBytes[0..3] $expectedMagic))
        }

        Write-Host ""
        Write-Host "  HTTP Status       : $httpStatus"
        Write-Host "  Content-Length hdr: $(if ($contentLength) { "$contentLength bytes" } else { "N/A (header absent)" })"
        Write-Host "  Actual downloaded : $actualSize bytes"
        Write-Host "  First 4 bytes     : [0x{0:X2} 0x{1:X2} 0x{2:X2} 0x{3:X2}]" -f $fileBytes[0], $fileBytes[1], $fileBytes[2], $fileBytes[3]
        Write-Host "  Is GGUF magic     : $(if ($isGguf) { "YES" } else { "NO" })"

        if ($isGguf) {
            Write-Host ""
            Write-Host "  *** SUCCESS — GGUF magic confirmed. Keeping file at: $tempFile" -ForegroundColor Green
            # Do NOT delete on success; CEO may inspect
        }
        else {
            Write-Host ""
            Write-Host "  *** NOT a valid GGUF. Deleting temp file." -ForegroundColor Yellow
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }

    } catch {
        $httpStatus = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A (exception)" }
        Write-Host ""
        Write-Host "  HTTP Status       : $httpStatus"
        Write-Host "  Error             : $($_.Exception.Message)" -ForegroundColor Red

        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QA COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
