$ErrorActionPreference = 'Stop'

$RunnerRoot = $PSScriptRoot
$VenvPath = Join-Path $RunnerRoot '.venv'
$VenvPython = Join-Path $VenvPath 'Scripts\python.exe'
$PythonCommand = Get-Command python -ErrorAction Stop
$PythonVersion = & $PythonCommand.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"

if ($PythonVersion -notmatch '^3\.(10|11|12)$') {
    throw "Use Python 3.10, 3.11, or 3.12. Current version: $PythonVersion"
}

if (-not (Test-Path -LiteralPath $VenvPython)) {
    & $PythonCommand.Source -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { throw 'Failed to create the virtual environment.' }
}

& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Failed to upgrade pip.' }

& $VenvPython -m pip install -r (Join-Path $RunnerRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }

Write-Host ''
Write-Host 'Local runner dependencies are ready.'
Write-Host 'Model weights were not downloaded. Follow models/README.md to add local model files.'
