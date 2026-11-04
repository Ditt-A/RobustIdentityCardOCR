$ErrorActionPreference = 'Stop'

$RunnerRoot = $PSScriptRoot
$VenvPath = Join-Path $RunnerRoot '.venv'
$VenvPython = Join-Path $VenvPath 'Scripts\python.exe'
$PythonCommand = Get-Command python -ErrorAction Stop
$PythonVersion = & $PythonCommand.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"

if ($PythonVersion -notmatch '^3\.(10|11|12)$') {
    throw "Gunakan Python 3.10, 3.11, atau 3.12. Versi saat ini: $PythonVersion"
}

if (-not (Test-Path -LiteralPath $VenvPython)) {
    & $PythonCommand.Source -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { throw 'Gagal membuat virtual environment.' }
}

& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Gagal memperbarui pip.' }

& $VenvPython -m pip install -r (Join-Path $RunnerRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Instalasi dependency gagal.' }

Write-Host ''
Write-Host 'Dependency local runner sudah disiapkan.'
Write-Host 'Weights belum diunduh. Ikuti models/README.md untuk mengisi folder model lokal.'
