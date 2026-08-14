-- Read-only share tokens for project exports.
create table public.project_share_tokens (
  token text primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.project_share_tokens enable row level security;

create policy "members manage share tokens" on public.project_share_tokens
  for all to authenticated
  using (
    exists (
      select 1 from public.workspace_memberships m
      where m.workspace_id = project_share_tokens.workspace_id and m.user_id = (select auth.uid())
    )
  );
