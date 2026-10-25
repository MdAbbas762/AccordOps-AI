# AccordOps n8n workflows

AccordOps V2 includes two **real, importable** n8n workflows. They are part of the product execution path, not screenshots or placeholder connectors.

## 1) AccordOps — Operational Evidence Monitor

File: `accordops-operational-evidence-monitor.json`

Story:

`Webhook → validate/normalize evidence → fetch approved Python control → prepare context → Gemini evaluation → normalize structured result → compliant? → record pass OR create exception + approval`

## 2) AccordOps — Approved Remediation

File: `accordops-approved-remediation.json`

Story:

`Human-approved action webhook → validate payload → re-fetch/verify Python action context → approval valid? → prepare remediation work item → report execution back to AccordOps → audit/resolution`

## Secret handling

Secrets are never embedded in exported workflow JSON. `scripts/prepare-n8n.ps1` creates the ignored `n8n/.env` file and synchronizes the shared AccordOps webhook secret with `backend/.env`.

The Gemini HTTP Request uses an n8n **Header Auth** credential. The credential can be named `AccordOps Gemini API`, but its actual HTTP header **Name** must be exactly `x-goog-api-key`; the **Value** is the Gemini API key. The display name of the credential and the HTTP header name are different fields.

## Setup

Follow [`docs/N8N_SETUP.md`](../docs/N8N_SETUP.md). You will import both JSON files into your own n8n instance, activate them, then view their real runs in n8n **Executions**.
