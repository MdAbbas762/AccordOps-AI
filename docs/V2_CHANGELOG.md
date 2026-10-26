# AccordOps AI V2 — Final correction pass

This pass converts the earlier MVP/prototype into the final portfolio-oriented Python + AI automation product.

## Product & UX

- Added a public product landing page with a clear B2B contract-operations purpose.
- Rebuilt product branding with one AccordOps control/contract mark used in the sidebar, login and favicon.
- Reworked the responsive application shell for mobile, laptop and desktop use at normal browser zoom.
- Redesigned Dashboard, Contracts, Obligations, Exceptions, Approvals, Audit Trail and Automation & AI screens.
- Replaced the dead connector gallery with live AI/n8n runtime status and workflow telemetry.
- Renamed the seeded portfolio tenant from `AccordOps Demo Organization` to `Northstar Services` via migration 004.
- Added controlled session-refresh/expiry behavior instead of exposing raw authentication-token errors in product pages.

## Contract intelligence

- Removed the fixed `62%` MVP confidence behavior.
- Python local-rules mode now scores each clause from explicit obligation language, responsible party, measurable thresholds, timing/trigger language, operational action clarity and ambiguity.
- Normalized descriptions are generated separately from faithful contract evidence/source clauses.
- Gemini extraction uses structured output and is labelled explicitly as Gemini.
- Deterministic Python fallback is labelled explicitly as Local Rules rather than pretending to be AI.
- Legacy fixed-confidence rows are neutralized by migration 004; the optional reset script provides a clean portfolio dataset.

## Python backend

- Python/FastAPI remains the authoritative domain and control layer.
- Added automation context/evaluation/action callback APIs for n8n.
- Added evidence evaluation, exception creation, investigation, approval and remediation state handling.
- Added a lightweight per-user mutation rate-limit safeguard for expensive/control-changing endpoints.
- Expanded readable audit-event mapping while retaining technical metadata for inspection.
- Added automation status/health reporting.

## n8n automation

- Added **AccordOps — Operational Evidence Monitor** (9 nodes): webhook, validation/normalization, Python control lookup, Gemini evaluation, normalization, compliance branch and AccordOps callbacks.
- Added **AccordOps — Approved Remediation** (8 nodes): approval webhook, validation, action-context re-verification, approval branch, work-item preparation and execution callback.
- Added shared-secret protection between FastAPI and n8n.
- Added `prepare-n8n.ps1` to synchronize ignored local environment settings without committing credentials.
- Added Docker compatibility for trusted Code-node environment access on the isolated local n8n instance.
- Added full import/activation/execution instructions and portfolio demo runbook.

## Verification

- Python source compiles.
- 8 backend tests pass in the sandbox (Supabase SDK stubbed only because the sandbox cannot install external packages).
- All frontend TypeScript/TSX source files pass syntax transpilation.
- Both n8n workflow exports parse as valid JSON and contain the expected workflow graphs.
- The final `scripts/validate.ps1` gates backend tests, workflow JSON, ESLint and the Next.js production build on the user's machine.
