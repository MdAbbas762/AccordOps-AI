-- OPTIONAL LOCAL/PORTFOLIO CLEANUP ONLY.
-- Deletes operational sample data for the Northstar/legacy AccordOps demo tenant while preserving users and organization.
-- Run only when you want a clean portfolio demonstration dataset.

do $$
declare
  target_org uuid;
begin
  select id into target_org
  from public.organizations
  where slug in ('northstar-services', 'accordops-demo')
  limit 1;

  if target_org is null then
    raise notice 'No AccordOps sample organization found; nothing deleted.';
    return;
  end if;

  delete from public.audit_logs where organization_id = target_org;
  delete from public.actions where organization_id = target_org;
  delete from public.approvals where organization_id = target_org;
  delete from public.investigations where organization_id = target_org;
  delete from public.exceptions where organization_id = target_org;
  delete from public.events where organization_id = target_org;
  delete from public.obligations where organization_id = target_org;
  delete from public.contract_versions where organization_id = target_org;
  delete from public.contracts where organization_id = target_org;
  delete from public.customers where organization_id = target_org;
end $$;
