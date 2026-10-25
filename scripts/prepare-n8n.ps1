$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $repo "backend\.env"
$n8nEnv = Join-Path $repo "n8n\.env"

if (-not (Test-Path $backendEnv)) {
    throw "backend\.env does not exist. Restore/configure backend secrets first."
}

function Read-EnvFile([string]$Path) {
    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $map[$parts[0].Trim()] = $parts[1]
        }
    }
    return $map
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
    $lines = @(Get-Content $Path)
    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match "^$([regex]::Escape($Name))=") {
            $found = $true
            "$Name=$Value"
        } else { $line }
    }
    if (-not $found) { $updated += "$Name=$Value" }
    Set-Content -Path $Path -Value $updated -Encoding utf8
}

$envMap = Read-EnvFile $backendEnv
$geminiKey = $envMap["GEMINI_API_KEY"]
if ([string]::IsNullOrWhiteSpace($geminiKey)) {
    throw "GEMINI_API_KEY is blank. AccordOps will remain in Python local-rules mode until a Gemini key is added. Add the key to backend/.env, then rerun prepare-n8n.ps1."
}

$secret = $envMap["N8N_WEBHOOK_SECRET"]
if ([string]::IsNullOrWhiteSpace($secret)) {
    $secret = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
}

Set-EnvValue $backendEnv "N8N_BASE_URL" "http://localhost:5678"
Set-EnvValue $backendEnv "N8N_EVIDENCE_WEBHOOK_URL" "http://localhost:5678/webhook/accordops-evidence-monitor"
Set-EnvValue $backendEnv "N8N_ACTION_WEBHOOK_URL" "http://localhost:5678/webhook/accordops-approved-remediation"
Set-EnvValue $backendEnv "N8N_WEBHOOK_SECRET" $secret

$envMap = Read-EnvFile $backendEnv
$geminiKey = $envMap["GEMINI_API_KEY"]
$geminiModel = $envMap["GEMINI_MODEL"]
if ([string]::IsNullOrWhiteSpace($geminiModel)) { $geminiModel = "gemini-3.5-flash-lite" }
$slack = $envMap["SLACK_WEBHOOK_URL"]

@(
    "ACCORDOPS_API_BASE_URL=http://host.docker.internal:8000/api/v1",
    "N8N_WEBHOOK_SECRET=$secret",
    "GEMINI_API_KEY=$geminiKey",
    "GEMINI_MODEL=$geminiModel",
    "SLACK_WEBHOOK_URL=$slack"
) | Set-Content -Path $n8nEnv -Encoding utf8

Write-Host "n8n environment prepared."
Write-Host "Backend webhook URLs configured."
Write-Host "n8n/.env created and is ignored by Git."
