-- Allow cancelled render state (queued render jobs can be cancelled).
alter table public.renders
  drop constraint if exists renders_status_check;
alter table public.renders
  add constraint renders_status_check check (status in ('rendering', 'succeeded', 'failed', 'cancelled'));
