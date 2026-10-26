# AccordOps AI V2 — Final local setup

This is the shortest safe path from the final ZIP to a validated local portfolio build while preserving the existing Git history.

## 1. Preserve the current repository and secrets

Stop frontend/backend processes. Rename the current folder to `AccordOps_AI_pre_v2_backup`, extract the final ZIP to `G:\\Projects\\AccordOps_AI`, then copy these three items from the backup into the new folder:

- `.git/`
- `backend/.env`
- `frontend/.env.local`

Do **not** run `git init` and do not force-push.

## 2. Apply only the new database migration

Migrations 001–003 were already applied. Run `supabase/migrations/004_product_v2_identity.sql` once in the Supabase SQL editor. It renames the seeded tenant to **Northstar Services** and neutralizes the old fixed-confidence MVP records.

For a clean portfolio demonstration, you may additionally run `supabase/scripts/reset_sample_workspace.sql`. It deletes only the operational sample data belonging to the seeded AccordOps workspace; it preserves the organization and authenticated user. Then upload the V2 sample contract again.

## 3. Install/validate dependencies

```powershell
cd G:\Projects\AccordOps_AI
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

Do not proceed if validation fails.

## 4. Configure Gemini + n8n

Add a Gemini API key to `backend/.env` if you want the real AI execution path. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-n8n.ps1
docker compose up -d
```

Open `http://localhost:5678`, import both workflow JSON files from `n8n/`, save and activate them. See `docs/N8N_SETUP.md`.

## 5. Start the application

After environment changes, restart FastAPI/frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

Open `http://localhost:3000`.

## 6. Final acceptance demo

Use `docs/samples/Northstar_Managed_Services_Agreement.docx` and follow `docs/PORTFOLIO_DEMO.md`. Confirm both n8n executions are visible before committing.

## 7. Git

Only after the final demo passes: inspect `git status`, split V2 into logical commits on top of the preserved history, and push normally. Never force-push.
