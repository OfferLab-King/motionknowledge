-- Render reuse: the manifest input hash a render was produced from, enabling
-- identical renders to be skipped and preview staleness to be detected.
alter table public.renders
  add column if not exists manifest_hash text;
