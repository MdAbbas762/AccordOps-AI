# ✅ AccordOps AI Validation

This document explains how AccordOps AI is validated before a release or portfolio demo. It covers both the automated validation script and the manual end-to-end checks used to confirm that the contract-control workflow behaves correctly.

---

## Automated Validation

From the repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

The script stops immediately if any validation gate fails.

It checks:

1. **Python backend tests** — validates backend services and core application logic.
2. **n8n workflow JSON syntax** — confirms the exported automation workflows are valid JSON.
3. **Frontend ESLint** — checks the Next.js codebase for linting issues.
4. **Next.js production build** — verifies that the frontend can compile successfully for production.

A success message is printed only after all validation stages pass.

---

## Expected Result

A successful run should finish without errors and print:

```text
AccordOps V2 validation completed successfully.
```

If any stage fails, fix that issue before treating the current state as release-ready.

---

## Manual End-to-End Validation

Automated checks verify code and workflow integrity, but AccordOps also requires a functional end-to-end test because its core value depends on multiple components working together.

The manual validation flow is:

```text
Contract Upload
      ↓
AI Obligation Extraction
      ↓
Human Review & Approval
      ↓
Evidence Submission
      ↓
Compliance Evaluation
      ↓
Exception Detection
      ↓
AI-Supported Investigation
      ↓
Human Approval
      ↓
Approved Remediation
      ↓
Audit Trail Update
```

### 1. Contract Ingestion

Upload a supported PDF or DOCX contract from the **Contracts** page.

Verify that:

- the document is stored successfully,
- the contract appears in the Contract Register,
- duplicate protection works when the same document is uploaded again,
- and contract metadata is available to the application.

### 2. Obligation Extraction

Run obligation extraction for the uploaded contract.

Verify that:

- candidate obligations are created,
- normalized obligation text is shown,
- the original contract evidence remains visible,
- risk and obligation type are populated,
- and extraction confidence is displayed.

### 3. Human Review

Approve at least one extracted obligation.

Verify that:

- the obligation changes from candidate to approved,
- the approved obligation becomes available for monitoring,
- and rejected obligations do not become active controls.

### 4. Evidence Monitoring

Open **Exceptions & monitoring**, select an approved obligation, and submit operational evidence.

A tested example is **Monthly Service Availability**:

| Item | Value |
|---|---|
| Contract requirement | `99.9%` monthly production availability |
| Observed result | `98.7%` |
| Expected result | Potential contractual variance |

Verify that:

- the monitoring request completes,
- the form clears after a successful submission,
- the success message appears and then disappears automatically,
- and the resulting monitoring state is refreshed correctly.

### 5. Exception Detection

For a non-compliant result, verify that:

- a new exception is created,
- the affected obligation is clearly identified,
- severity and finding are visible,
- the evidence context is preserved,
- and the exception enters the investigation/review lifecycle.

### 6. Investigation & Approval

Open the **Approvals** page.

Verify that:

- the investigation result is available,
- a recommended corrective action is presented,
- the action remains blocked while approval is pending,
- the reviewer can approve or reject it,
- and rejection does not execute remediation.

### 7. Approved Remediation

Approve a pending corrective action.

Verify that:

- the approved-remediation n8n workflow is triggered,
- the workflow validates the action and approval context,
- remediation completes successfully,
- the result is returned to AccordOps,
- and the related exception/action state updates correctly.

### 8. Operational Visibility

Verify the final state across:

- **Control Center** — contract, obligation, exception, approval, and activity summaries;
- **Operations Status** — monitoring coverage and operational state;
- **Audit Trail** — chronological record of the important actions and decisions.

---

## n8n Workflow Validation

The repository contains two main automation workflows:

```text
n8n/accordops-operational-evidence-monitor.json
n8n/accordops-approved-remediation.json
```

For a functional test, confirm that successful executions are visible in n8n for both workflows.

### Operational Evidence Monitor

Expected responsibilities:

```text
Evidence
→ Validate Input
→ Load Approved Control
→ Prepare AI Evaluation
→ Evaluate Compliance
→ Normalize Result
→ Branch on Compliance
→ Create Exception / Approval when required
```

### Approved Remediation

Expected responsibilities:

```text
Approved Action
→ Validate Context
→ Verify Human Approval
→ Prepare Remediation
→ Execute
→ Report Result to AccordOps
```

---

## Release Checklist

Before a final commit or demo, confirm:

- [ ] `scripts\validate.ps1` passes
- [ ] frontend loads successfully
- [ ] backend API is available
- [ ] Supabase authentication works
- [ ] contract upload works
- [ ] obligation extraction works
- [ ] approved obligations appear in monitoring
- [ ] compliant and non-compliant evidence can be evaluated
- [ ] exceptions are created when required
- [ ] approval and rejection paths work
- [ ] approved remediation executes through n8n
- [ ] Control Center and Operations Status reflect the latest state
- [ ] Audit Trail records the lifecycle
- [ ] no secrets or local environment files are staged for Git

---

## Notes

The automated validation script checks code, workflow syntax, linting, and the production build. The manual validation steps above verify the actual multi-service behavior of AccordOps across the frontend, backend, Supabase, Gemini, and n8n.

Both levels are important: passing the script confirms the codebase is healthy, while the end-to-end checks confirm that the operational-control workflow works as intended.
