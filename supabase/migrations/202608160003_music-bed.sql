-- Music bed toggle: a deterministic ambient bed is mixed under narration.
alter table public.projects
  add column if not exists music_bed boolean not null default true;
