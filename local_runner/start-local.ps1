$ErrorActionPreference = 'Stop'

$RunnerRoot = $PSScriptRoot
$VenvPython = Join-Path $RunnerRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $VenvPython)) {
    throw 'Environment belum dibuat. Jalankan local_runner\setup-local.ps1 terlebih dahulu.'
}

Set-Location -LiteralPath $RunnerRoot
Write-Host 'Local runner hanya menerima koneksi dari laptop ini: http://127.0.0.1:8787'
Write-Host 'Model akan dimuat secara malas saat permintaan OCR pertama diterima.'
& $VenvPython -m uvicorn app:app --host 127.0.0.1 --port 8787 --workers 1
