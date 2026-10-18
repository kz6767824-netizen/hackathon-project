create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'user')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (user_id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "Members can read their workspaces" on public.workspaces;
create policy "Members can read their workspaces"
  on public.workspaces for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read their own membership" on public.workspace_members;
create policy "Users can read their own membership"
  on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.create_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
  workspace_name text;
begin
  workspace_name := nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), '');
  if workspace_name is null then
    raise exception 'Workspace name is required';
  end if;

  insert into public.workspaces (name, created_by)
  values (workspace_name, new.id)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute function public.create_workspace_for_new_user();
