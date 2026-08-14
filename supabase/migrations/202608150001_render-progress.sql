-- Live render progress tracking.
alter table public.renders
  add column if not exists progress integer not null default 0;
