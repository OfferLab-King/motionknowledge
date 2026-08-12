-- MotionKnowledge initial schema: tenancy, pipeline artifacts, jobs, usage.
-- Every tenant-owned table resolves to workspace_id and is protected by RLS.

-- Profile mirror for auth users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users manage own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Workspaces and memberships
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

create policy "members read workspaces" on public.workspaces
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = workspaces.id and m.user_id = (select auth.uid())
  ));

create policy "members read memberships" on public.workspace_memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owners update memberships" on public.workspace_memberships
  for update to authenticated
  using (
    exists (
      select 1 from public.workspace_memberships m
      where m.workspace_id = workspace_memberships.workspace_id
        and m.user_id = (select auth.uid()) and m.role = 'owner'
    )
  );

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  audience_level text not null default 'beginner'
    check (audience_level in ('beginner', 'intermediate', 'advanced')),
  target_duration_seconds integer not null default 300,
  language text not null default 'en',
  tone text not null default 'professional',
  style text not null default 'professional',
  aspect_ratio text not null default '16:9' check (aspect_ratio in ('16:9', '9:16')),
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'RESEARCHING', 'OUTLINE_READY', 'SCRIPT_READY', 'STORYBOARD_READY',
    'GENERATING', 'PREVIEW_READY', 'QA_FAILED', 'READY_FOR_REVIEW', 'APPROVED',
    'RENDERING', 'COMPLETE'
  )),
  latest_preview_render_id uuid,
  latest_render_result_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "workspace members read projects" on public.projects
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = projects.workspace_id
      and m.user_id = (select auth.uid())
  ));

create policy "workspace members insert projects" on public.projects
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = projects.workspace_id
      and m.user_id = (select auth.uid())
  ));

create policy "workspace members update projects" on public.projects
  for update to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = projects.workspace_id
      and m.user_id = (select auth.uid())
  ));

create index projects_workspace_idx on public.projects (workspace_id);
create index projects_status_idx on public.projects (status);
create index projects_created_idx on public.projects (created_at desc);

-- Sources (supplied documents and fetched URLs)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version integer not null default 1,
  kind text not null check (kind in ('url', 'text', 'pdf', 'docx', 'pptx', 'csv', 'json', 'file')),
  title text not null,
  raw_sha256 text not null,
  normalized_sha256 text not null,
  original_url text,
  fetched_at timestamptz,
  language text not null default 'en',
  byte_count integer not null default 0,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSED', 'FAILED')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sources enable row level security;

create policy "members read sources" on public.sources
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = sources.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert sources" on public.sources
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = sources.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members update sources" on public.sources
  for update to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = sources.workspace_id and m.user_id = (select auth.uid())
  ));

create index sources_project_idx on public.sources (project_id);

-- Research documents (versioned; immutable rows)
create table public.research_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  provider text not null,
  input_hash text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.research_documents enable row level security;

create policy "members read research_documents" on public.research_documents
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = research_documents.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert research_documents" on public.research_documents
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = research_documents.workspace_id and m.user_id = (select auth.uid())
  ));

create index research_documents_project_idx on public.research_documents (project_id, is_active);

-- Claims and claim-source links
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  research_document_id uuid references public.research_documents (id) on delete set null,
  claim_id text not null,
  text text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  category text not null default 'fact',
  created_at timestamptz not null default now(),
  unique (project_id, claim_id)
);

create table public.claim_source_links (
  claim_id uuid not null references public.claims (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  primary key (claim_id, source_id)
);

alter table public.claims enable row level security;
alter table public.claim_source_links enable row level security;

create policy "members read claims" on public.claims
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = claims.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert claims" on public.claims
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = claims.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members read claim_source_links" on public.claim_source_links
  for select to authenticated
  using (claim_id in (
    select c.id from public.claims c
    join public.workspace_memberships m on m.workspace_id = c.workspace_id
    where m.user_id = (select auth.uid())
  ));

create index claims_project_idx on public.claims (project_id);

-- Versioned pipeline artifacts: lesson plans, scripts, storyboards, captions,
-- TTS manifests, QA results. One row per immutable version; is_active is the pointer.
create table public.lesson_plan_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  provider text not null,
  cost_usd text not null default '0',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  provider text not null,
  cost_usd text not null default '0',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.storyboard_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  provider text not null,
  cost_usd text not null default '0',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.caption_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tts_manifest_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.qa_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.render_manifest_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.youtube_metadata_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['lesson_plan_versions','script_versions','storyboard_versions','caption_versions','tts_manifest_versions','qa_versions','render_manifest_versions','youtube_metadata_versions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (
         select 1 from public.workspace_memberships m
         where m.workspace_id = %I.workspace_id and m.user_id = (select auth.uid())))',
      t || '_read', t, t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (exists (
         select 1 from public.workspace_memberships m
         where m.workspace_id = %I.workspace_id and m.user_id = (select auth.uid())))',
      t || '_insert', t, t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (exists (
         select 1 from public.workspace_memberships m
         where m.workspace_id = %I.workspace_id and m.user_id = (select auth.uid())))',
      t || '_update', t, t);
  end loop;
end $$;

-- Scenes and immutable scene versions
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scene_key text not null,
  index integer not null default 0,
  title text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  active_scene_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, scene_key)
);

create table public.scene_versions (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null,
  input_hash text not null,
  provider text not null,
  cost_usd text not null default '0',
  created_at timestamptz not null default now()
);

alter table public.scenes enable row level security;
alter table public.scene_versions enable row level security;

create policy "members read scenes" on public.scenes
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = scenes.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members update scenes" on public.scenes
  for update to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = scenes.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members read scene_versions" on public.scene_versions
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = scene_versions.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert scene_versions" on public.scene_versions
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = scene_versions.workspace_id and m.user_id = (select auth.uid())
  ));

create index scenes_project_idx on public.scenes (project_id, index);
create index scene_versions_scene_idx on public.scene_versions (scene_id);

-- Assets and asset links (provenance)
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null,
  sha256 text not null,
  content_type text not null,
  byte_count integer not null default 0,
  origin text not null check (origin in ('supplied', 'research', 'generated', 'stock', 'licensed', 'derived')),
  source_url text,
  license text not null,
  attribution text,
  prompt text,
  estimated_cost_usd text not null default '0',
  provider text not null default 'local',
  created_at timestamptz not null default now()
);

create table public.asset_links (
  asset_id uuid not null references public.assets (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete cascade,
  purpose text not null,
  created_at timestamptz not null default now(),
  primary key (asset_id, purpose)
);

alter table public.assets enable row level security;
alter table public.asset_links enable row level security;

create policy "members read assets" on public.assets
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = assets.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert assets" on public.assets
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = assets.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members read asset_links" on public.asset_links
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = asset_links.workspace_id and m.user_id = (select auth.uid())
  ));

create index assets_project_idx on public.assets (project_id);

-- Audio assets for narration
create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete cascade,
  scene_version_id uuid references public.scene_versions (id) on delete cascade,
  asset_key text not null,
  sha256 text not null,
  duration_ms integer not null,
  sample_rate_hz integer not null default 24000,
  provider text not null,
  model text not null,
  word_timings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.audio_assets enable row level security;

create policy "members read audio_assets" on public.audio_assets
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = audio_assets.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members insert audio_assets" on public.audio_assets
  for insert to authenticated
  with check (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = audio_assets.workspace_id and m.user_id = (select auth.uid())
  ));

create index audio_assets_project_idx on public.audio_assets (project_id);

-- Generation jobs (pg-boss handled by application; table mirrors job state for UI)
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  operation text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'superseded')),
  input_hash text not null,
  idempotency_key text not null unique,
  attempt integer not null default 0,
  payload jsonb not null default '{}',
  error_code text,
  safe_error text,
  correlation_id text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.generation_jobs enable row level security;

create policy "members read generation_jobs" on public.generation_jobs
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = generation_jobs.workspace_id and m.user_id = (select auth.uid())
  ));

create index generation_jobs_project_idx on public.generation_jobs (project_id);
create index generation_jobs_status_idx on public.generation_jobs (status);

-- Render jobs and renders
create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('PREVIEW', 'FINAL')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'superseded')),
  manifest_input_hash text not null,
  render_id uuid,
  error_code text,
  safe_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.renders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('PREVIEW', 'FINAL')),
  status text not null default 'rendering'
    check (status in ('rendering', 'succeeded', 'failed')),
  mp4_key text,
  mp4_sha256 text,
  srt_key text,
  transcript_key text,
  thumbnail_key text,
  chapters_key text,
  metadata_key text,
  duration_seconds numeric,
  width integer,
  height integer,
  video_codec text,
  audio_codec text,
  fps numeric,
  provider_cost_usd text not null default '0',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.render_jobs enable row level security;
alter table public.renders enable row level security;

create policy "members read render_jobs" on public.render_jobs
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = render_jobs.workspace_id and m.user_id = (select auth.uid())
  ));

create policy "members read renders" on public.renders
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = renders.workspace_id and m.user_id = (select auth.uid())
  ));

create index render_jobs_project_idx on public.render_jobs (project_id);
create index renders_project_idx on public.renders (project_id, created_at desc);

-- Usage events (internal cost accounting, never customer credits)
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  provider text not null,
  model text not null,
  operation text not null,
  input_units text not null default '0',
  output_units text not null default '0',
  provider_cost_usd text not null default '0',
  compute_duration_ms integer not null default 0,
  job_id uuid,
  correlation_id text,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "members read usage_events" on public.usage_events
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = usage_events.workspace_id and m.user_id = (select auth.uid())
  ));

create index usage_events_project_idx on public.usage_events (project_id);
create index usage_events_workspace_idx on public.usage_events (workspace_id, created_at desc);

-- Subscriptions and credit ledger (customer billing, separate from internal cost)
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'trial', 'active', 'past_due', 'cancelled')),
  plan text not null default 'free',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.subscriptions enable row level security;

create policy "members read subscriptions" on public.subscriptions
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = subscriptions.workspace_id and m.user_id = (select auth.uid())
  ));

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entry_type text not null check (entry_type in ('grant', 'consume', 'refund')),
  amount_credits integer not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;

create policy "members read credit_ledger" on public.credit_ledger
  for select to authenticated
  using (exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = credit_ledger.workspace_id and m.user_id = (select auth.uid())
  ));

create index credit_ledger_workspace_idx on public.credit_ledger (workspace_id, created_at desc);

-- Updated-at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_touch_updated_at before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger sources_touch_updated_at before update on public.sources
  for each row execute function public.touch_updated_at();
create trigger scenes_touch_updated_at before update on public.scenes
  for each row execute function public.touch_updated_at();

-- Grants: Supabase roles operate through RLS; DML privileges mirror managed
-- Supabase, which grants default privileges for the migration role.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
