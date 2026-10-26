# Validation

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

The script fails immediately if any gate fails and validates:

1. Python backend tests
2. n8n workflow JSON syntax
3. frontend ESLint
4. Next.js production build

A success message is printed only if all four stages pass.
