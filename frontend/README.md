# AccordOps AI Frontend

Next.js operator interface for AccordOps AI.

The frontend is intentionally the presentation layer. Contract processing, control extraction, monitoring persistence, exception creation, approvals and automation callbacks live in the Python/FastAPI backend.

Routes:

- `/` — public product overview
- `/login` — organization-managed sign in
- `/dashboard` — control center
- `/contracts` — private contract ingestion and extraction
- `/obligations` — human verification queue
- `/exceptions` — evidence monitoring and investigated variances
- `/approvals` — human remediation gate
- `/audit` — readable audit history
- `/automation` — real AI/n8n runtime status
