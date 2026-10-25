-- AccordOps AI
-- Migration 003: Contract ingestion integrity

create unique index if not exists
unique_contract_file_hash_per_organization
on public.contract_versions (
  organization_id,
  file_hash
)
where file_hash is not null;
