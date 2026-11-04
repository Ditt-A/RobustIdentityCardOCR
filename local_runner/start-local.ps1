$ErrorActionPreference = 'Stop'

$RunnerRoot = $PSScriptRoot
$VenvPython = Join-Path $RunnerRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $VenvPython)) {
    throw 'The environment has not been created. Run local_runner\setup-local.ps1 first.'
}

Set-Location -LiteralPath $RunnerRoot
Write-Host 'The local runner accepts connections only from this computer: http://127.0.0.1:8787'
Write-Host 'The model loads on the first OCR request.'
& $VenvPython -m uvicorn app:app --host 127.0.0.1 --port 8787 --workers 1
