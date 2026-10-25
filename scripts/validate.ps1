$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

function Assert-LastExitCode {
    param([string]$Step)
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

Write-Host "[1/4] Backend tests"
Push-Location "$repo\backend"
try {
    & ".\.venv\Scripts\python.exe" -m pytest -q
    Assert-LastExitCode "Backend tests"
}
finally { Pop-Location }

Write-Host ""
Write-Host "[2/4] n8n workflow JSON validation"
Push-Location $repo
try {
    & "$repo\backend\.venv\Scripts\python.exe" -c "import json,glob; [json.load(open(p,encoding='utf-8')) for p in glob.glob('n8n/*.json')]; print('n8n workflow JSON valid')"
    Assert-LastExitCode "n8n workflow validation"
}
finally { Pop-Location }

Write-Host ""
Write-Host "[3/4] Frontend lint"
Push-Location "$repo\frontend"
try {
    & npm.cmd run lint
    Assert-LastExitCode "Frontend lint"

    Write-Host ""
    Write-Host "[4/4] Frontend production build"
    & npm.cmd run build
    Assert-LastExitCode "Frontend production build"
}
finally { Pop-Location }

Write-Host ""
Write-Host "AccordOps V2 validation completed successfully."
