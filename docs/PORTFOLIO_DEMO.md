# AccordOps AI — Portfolio Demo Runbook

## Before recording

- Apply migration `004_product_v2_identity.sql`.
- For a clean dataset, optionally run `supabase/scripts/reset_sample_workspace.sql`.
- Add a Gemini API key.
- Run `scripts/prepare-n8n.ps1`.
- Import and activate both n8n workflows.
- Run `scripts/validate.ps1`.
- Start FastAPI, Next.js and n8n.

## Demo story

### 1. Product context
Open `/` and explain:

> AccordOps turns signed contract commitments into monitored operational controls. Python owns the contract domain and control model; Gemini provides semantic reasoning; n8n orchestrates evidence and approved remediation.

### 2. Contract ingestion
Upload:

`docs/samples/Northstar_Managed_Services_Agreement.docx`

Show private ingestion and the contract register.

### 3. Control extraction
Click **Extract obligations**.

On Obligations, point out:

- normalized business requirement;
- expandable source clause;
- extraction provider;
- non-fixed confidence score + evidence factors;
- risk/status.

Approve the **Priority 1 incident response** control.

### 4. Evidence automation
Open Exceptions and submit:

Observed value:

`78 minutes`

Evidence:

`Incident INC-1042 opened at 09:00 and was acknowledged at 10:18.`

Switch to n8n and show the execution moving through:

Webhook → Normalize → Fetch Python control → Gemini → Parse → IF → Create Exception & Approval.

### 5. Human approval
Back in AccordOps, show the exception and AI finding. Open Approvals and choose **Approve & execute**.

### 6. Controlled remediation
Switch to n8n and show the second workflow:

Approval Webhook → Verify Action Context → Verify Human Approval → IF → Prepare Work Item → Callback.

### 7. Auditability
Open Audit Trail. Show business-readable event summaries and expand Technical Details only once to show trace IDs/model/execution metadata.

### 8. Architecture/status
Open Operations Status. Show live monitoring coverage, current exceptions/decisions, the latest evidence check and the most recent remediation result.
