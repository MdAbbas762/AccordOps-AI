-- AccordOps AI
-- Migration 001: Initial database schema
-- Core multi-tenant data model, auth profile bootstrap, RLS, and audit-ready entities.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  email text,
  role text not null default 'viewer'
    check (role in ('admin', 'reviewer', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  external_ref text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  contract_type text not null default 'other'
    check (contract_type in ('msa', 'sow', 'amendment', 'other')),
  status text not null default 'draft'
    check (status in ('draft', 'under_review', 'active', 'expired', 'terminated')),
  effective_date date,
  expiration_date date,
  auto_renews boolean not null default false,
  renewal_notice_days integer
    check (renewal_notice_days is null or renewal_notice_days >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_label text not null,
  source_type text not null default 'original'
    check (source_type in ('original', 'amendment', 'sow', 'other')),
  file_name text,
  file_path text,
  mime_type text,
  file_hash text,
  extracted_text text,
  page_count integer
    check (page_count is null or page_count >= 0),
  is_current boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists one_current_contract_version
on public.contract_versions (contract_id)
where is_current = true;

create table if not exists public.obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid references public.contract_versions(id) on delete set null,
  obligation_type text not null
    check (obligation_type in ('sla', 'billing', 'deliverable', 'renewal', 'other')),
  title text not null,
  description text not null,
  responsible_party text,
  owner_team text,
  status text not null default 'candidate'
    check (status in ('candidate', 'approved', 'rejected', 'paused', 'retired')),
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  ai_confidence numeric(5,4)
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  source_clause text,
  source_page integer
    check (source_page is null or source_page >= 1),
  source_text text,
  rule_config jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source_system text not null,
  external_event_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists unique_event_dedupe
on public.events (organization_id, source_system, dedupe_key)
where dedupe_key is not null;

create table if not exists public.exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  obligation_id uuid not null references public.obligations(id) on delete cascade,
  source_event_id uuid references public.events(id) on delete set null,
  exception_type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'pending_approval', 'resolved', 'dismissed')),
  title text not null,
  summary text,
  expected_value jsonb not null default '{}'::jsonb,
  observed_value jsonb not null default '{}'::jsonb,
  dedupe_key text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists unique_exception_dedupe
on public.exceptions (organization_id, dedupe_key)
where dedupe_key is not null;

create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exception_id uuid not null references public.exceptions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  finding text,
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(5,4)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  variance jsonb not null default '{}'::jsonb,
  recommended_action text,
  model_name text,
  prompt_version text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exception_id uuid not null references public.exceptions(id) on delete cascade,
  investigation_id uuid references public.investigations(id) on delete set null,
  requested_action text not null,
  risk_level text not null
    check (risk_level in ('green', 'amber', 'red')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exception_id uuid references public.exceptions(id) on delete set null,
  approval_id uuid references public.approvals(id) on delete set null,
  action_type text not null,
  target_system text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create unique index if not exists unique_action_idempotency
on public.actions (organization_id, idempotency_key)
where idempotency_key is not null;

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null
    check (provider in ('jira', 'hubspot', 'stripe', 'slack', 'n8n')),
  display_name text,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error')),
  config jsonb not null default '{}'::jsonb,
  credential_reference text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null
    check (actor_type in ('user', 'system', 'ai', 'n8n')),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_organization on public.profiles (organization_id);
create index if not exists idx_customers_organization on public.customers (organization_id);
create index if not exists idx_contracts_org_customer on public.contracts (organization_id, customer_id);
create index if not exists idx_contract_versions_contract on public.contract_versions (contract_id);
create index if not exists idx_obligations_org_status on public.obligations (organization_id, status);
create index if not exists idx_obligations_contract on public.obligations (contract_id);
create index if not exists idx_events_org_time on public.events (organization_id, occurred_at desc);
create index if not exists idx_exceptions_org_status on public.exceptions (organization_id, status);
create index if not exists idx_investigations_exception on public.investigations (exception_id);
create index if not exists idx_approvals_org_status on public.approvals (organization_id, status);
create index if not exists idx_actions_org_status on public.actions (organization_id, status);
create index if not exists idx_audit_logs_org_time on public.audit_logs (organization_id, created_at desc);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute procedure public.set_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
before update on public.contracts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_obligations_updated_at on public.obligations;
create trigger set_obligations_updated_at
before update on public.obligations
for each row execute procedure public.set_updated_at();

drop trigger if exists set_exceptions_updated_at on public.exceptions;
create trigger set_exceptions_updated_at
before update on public.exceptions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_integrations_updated_at on public.integrations;
create trigger set_integrations_updated_at
before update on public.integrations
for each row execute procedure public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_versions enable row level security;
alter table public.obligations enable row level security;
alter table public.events enable row level security;
alter table public.exceptions enable row level security;
alter table public.investigations enable row level security;
alter table public.approvals enable row level security;
alter table public.actions enable row level security;
alter table public.integrations enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can read own organization" on public.organizations;
create policy "Users can read own organization"
on public.organizations
for select
to authenticated
using (
  id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant customers" on public.customers;
create policy "Users can read tenant customers"
on public.customers
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant contracts" on public.contracts;
create policy "Users can read tenant contracts"
on public.contracts
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant contract versions" on public.contract_versions;
create policy "Users can read tenant contract versions"
on public.contract_versions
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant obligations" on public.obligations;
create policy "Users can read tenant obligations"
on public.obligations
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant events" on public.events;
create policy "Users can read tenant events"
on public.events
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant exceptions" on public.exceptions;
create policy "Users can read tenant exceptions"
on public.exceptions
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant investigations" on public.investigations;
create policy "Users can read tenant investigations"
on public.investigations
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant approvals" on public.approvals;
create policy "Users can read tenant approvals"
on public.approvals
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant actions" on public.actions;
create policy "Users can read tenant actions"
on public.actions
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant integrations" on public.integrations;
create policy "Users can read tenant integrations"
on public.integrations
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Users can read tenant audit logs" on public.audit_logs;
create policy "Users can read tenant audit logs"
on public.audit_logs
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- Data API privileges
-- New tables are NOT auto-exposed in this Supabase project, so grant only
-- the minimum privileges we intentionally want.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select on table
  public.organizations,
  public.profiles,
  public.customers,
  public.contracts,
  public.contract_versions,
  public.obligations,
  public.events,
  public.exceptions,
  public.investigations,
  public.approvals,
  public.actions,
  public.integrations,
  public.audit_logs
to authenticated;

-- FastAPI will use the service role for controlled backend writes.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

