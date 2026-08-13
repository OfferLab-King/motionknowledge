-- Per-project narration voice selection.
alter table public.projects
  add column if not exists voice text not null default 'Samantha';
