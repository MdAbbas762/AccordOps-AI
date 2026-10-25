$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

Write-Host "[1/2] Preparing Python backend..."
Set-Location "$repo\backend"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "[2/2] Preparing Next.js frontend..."
Set-Location "$repo\frontend"
npm.cmd install

Write-Host ""
Write-Host "AccordOps dependencies installed successfully."
Write-Host "Next: configure backend/.env and frontend/.env.local, then run scripts\validate.ps1."
