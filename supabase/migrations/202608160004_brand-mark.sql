-- Brand watermark toggle.
alter table public.projects
  add column if not exists brand_mark boolean not null default true;
