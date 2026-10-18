-- Initial storage for public website enquiries.
-- Apply this migration to the team's Supabase database before using POST /api/leads.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists workspaces_slug_unique
  on public.workspaces (lower(slug));

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('Owner', 'Admin', 'User')),
  permissions text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_idx
  on public.workspace_memberships (user_id);

-- Supabase Auth calls this trigger as part of creating auth.users. Workspace
-- and Owner membership are committed in the same database transaction.
create or replace function public.create_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_name text;
  v_full_name text;
  v_workspace_id uuid;
  v_slug_base text;
begin
  v_workspace_name := nullif(btrim(new.raw_user_meta_data ->> 'workspace_name'), '');
  v_full_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');

  if v_workspace_name is null then
    raise exception 'Workspace name is required';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_workspace_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'workspace';
  end if;

  insert into public.workspaces (name, slug)
  values (v_workspace_name, left(v_slug_base, 54) || '-' || left(replace(new.id::text, '-', ''), 8))
  returning id into v_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role, permissions)
  values (
    v_workspace_id,
    new.id,
    'Owner',
    array['view', 'create', 'edit', 'delete', 'export', 'view_value', 'manage_assignment', 'manage_integrations', 'view_audit']
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute procedure public.create_workspace_for_new_user();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  constraint contacts_need_contact_method check (
    nullif(btrim(email), '') is not null or nullif(btrim(phone), '') is not null
  )
);

create index if not exists contacts_workspace_created_idx
  on public.contacts (workspace_id, created_at desc);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  message text not null default '',
  source text not null default 'website',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'acknowledged', 'escalated', 'open'))
);

create index if not exists leads_workspace_created_idx
  on public.leads (workspace_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Users can read their workspace memberships" on public.workspace_memberships;
create policy "Users can read their workspace memberships"
  on public.workspace_memberships for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Members can read their workspace" on public.workspaces;
create policy "Members can read their workspace"
  on public.workspaces for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = workspaces.id and m.user_id = (select auth.uid())
  ));

drop policy if exists "Members can read workspace contacts" on public.contacts;
create policy "Members can read workspace contacts"
  on public.contacts for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = contacts.workspace_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "Members can read workspace leads" on public.leads;
create policy "Members can read workspace leads"
  on public.leads for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = leads.workspace_id and m.user_id = (select auth.uid())
  ));

-- The public form must not access tables directly. It calls the server API,
-- which invokes this function with the server-only service role key.
create or replace function public.create_public_lead(
  p_workspace_slug text,
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_workspace_id uuid;
  v_contact_id uuid;
  v_lead_id uuid;
  v_created_at timestamptz;
begin
  select w.id into v_workspace_id
  from public.workspaces as w
  where lower(w.slug) = lower(btrim(p_workspace_slug))
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace not found' using errcode = 'P0002';
  end if;

  insert into public.contacts (workspace_id, name, email, phone)
  values (
    v_workspace_id,
    btrim(p_name),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  returning contacts.id into v_contact_id;

  insert into public.leads (workspace_id, contact_id, message, source, status)
  values (v_workspace_id, v_contact_id, coalesce(btrim(p_message), ''), 'website', 'new')
  returning leads.id, leads.created_at into v_lead_id, v_created_at;

  return query select v_lead_id, 'new'::text, v_created_at;
end;
$$;

revoke all on function public.create_public_lead(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_public_lead(text, text, text, text, text) to service_role;