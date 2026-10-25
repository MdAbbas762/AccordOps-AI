-- AccordOps AI V2 product identity cleanup.
-- Keeps the same organization/profile relationships while removing temporary demo naming.

update public.organizations
set name = 'Northstar Services',
    slug = 'northstar-services'
where slug = 'accordops-demo'
   or name = 'AccordOps Demo Organization';

update public.customers
set name = 'Northstar Operations'
where name = 'Demo Customer'
  and organization_id in (
    select id from public.organizations where slug = 'northstar-services'
  );

-- Legacy MVP demo extraction used a fixed 0.62 confidence. Never present that as a real score.
update public.obligations
set ai_confidence = null,
    rule_config = coalesce(rule_config, '{}'::jsonb)
      || jsonb_build_object(
        'ai_provider', 'legacy_demo',
        'ai_model', 'legacy-fixed-score',
        'confidence_factors', jsonb_build_array('Legacy MVP result — re-extract contract with V2')
      )
where ai_confidence = 0.62
  and coalesce(rule_config ->> 'ai_provider', '') = 'demo';
