$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

Write-Host "Starting n8n..."
Push-Location $repo
try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "Docker/n8n failed to start." }
}
finally { Pop-Location }

& "$PSScriptRoot\start-dev.ps1"
Write-Host "n8n:     http://localhost:5678"
Write-Host "Backend: http://localhost:8000/docs"
Write-Host "App:     http://localhost:3000"
