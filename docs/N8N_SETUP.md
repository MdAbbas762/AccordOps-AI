# n8n Setup — AccordOps V2

## What you will have in n8n

Two real workflows:

1. **AccordOps — Operational Evidence Monitor**
   - Webhook receives an evidence event from FastAPI.
   - Code node validates and normalizes payload.
   - HTTP Request fetches the approved contract control from Python.
   - Code node builds the evaluation context.
   - HTTP Request calls Gemini.
   - Code node parses the structured result.
   - IF node branches compliant vs exception.
   - Callback records either compliant evidence or creates exception + approval in AccordOps.

2. **AccordOps — Approved Remediation**
   - Webhook receives only a human-approved action.
   - Python action context is re-verified.
   - IF node prevents invalid/stale execution.
   - n8n creates the controlled remediation work-item payload.
   - Callback marks the action executed and resolves the exception.

## One-time local setup

### 1. Put your Gemini API key in `backend/.env`

```env
AI_MODE=auto
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 2. Generate/sync the n8n environment

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-n8n.ps1
```

This:

- creates a long random `N8N_WEBHOOK_SECRET` if one does not exist;
- configures the two production webhook URLs in `backend/.env`;
- creates ignored `n8n/.env` for Docker;
- passes Gemini + backend callback settings to n8n without committing secrets.

### 3. Start n8n

```powershell
docker compose up -d
```

Open `http://localhost:5678`.

### 4. Import both workflows

In n8n:

- **Workflows → Import from File**
- import `n8n/accordops-operational-evidence-monitor.json`
- import `n8n/accordops-approved-remediation.json`

Open each workflow and verify there are no missing node-version migrations. Save both.

### 5. Configure the Gemini Header Auth credential

Open **AccordOps — Operational Evidence Monitor → Gemini Compliance Evaluation** and create/select a **Header Auth** credential.

- Credential display name: `AccordOps Gemini API`
- Header **Name**: `x-goog-api-key`
- Header **Value**: your Gemini API key

Do not put `AccordOps Gemini API` in the Header **Name** field. HTTP header names cannot contain spaces; using the credential display name there causes `ERR_INVALID_HTTP_TOKEN`.

### 6. Activate both workflows

The production webhook routes only work while the workflows are active.

Expected endpoints:

- `http://localhost:5678/webhook/accordops-evidence-monitor`
- `http://localhost:5678/webhook/accordops-approved-remediation`

These are already written into `backend/.env` by the preparation script.

### 7. Restart backend after environment changes

Stop/restart the FastAPI dev server so it reads the new n8n values.

## Test it from AccordOps

1. Approve an obligation.
2. Go to **Exceptions**.
3. Select the approved control.
4. Submit an intentionally non-compliant observation.
5. Open n8n **Executions** and confirm the Evidence Monitor executed.
6. Return to AccordOps; an exception + approval should exist.
7. Approve it.
8. Confirm the Approved Remediation workflow appears in n8n Executions.
9. Confirm Audit Trail contains an automation-completed event.

## Docker-to-host callback detail

n8n runs in Docker. The workflows call FastAPI through:

`http://host.docker.internal:8000/api/v1`

This is why the n8n environment differs from the browser/backend URL `http://localhost:8000`.

## Portfolio proof

Capture screenshots/video of:

- both workflow canvases;
- one successful Evidence Monitor execution with node data;
- the compliant/non-compliant IF branch;
- one Approved Remediation execution;
- the resulting AccordOps exception/approval/audit entries.

That proves real orchestration rather than simply storing workflow JSON in Git.
