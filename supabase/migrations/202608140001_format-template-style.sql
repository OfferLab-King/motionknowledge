-- Format, template and style identity for projects.
-- Legacy `style` column is retained for back-compat; `style_id` is the
-- registered style, `style_version` allows style changes to be traced.
alter table public.projects
  add column if not exists format text not null default 'explainer';
alter table public.projects
  add column if not exists template_id text;
alter table public.projects
  add column if not exists style_id text not null default 'signature';
alter table public.projects
  add column if not exists style_version integer not null default 1;

-- Backfill: existing projects created with the legacy style strings map onto
-- registered styles so old projects keep rendering with their chosen look.
update public.projects
  set style_id = 'signature'
  where style_id = 'signature'
    and style in ('professional', 'bold');
update public.projects
  set style_id = 'editorial'
  where style_id = 'signature'
    and style = 'bold';
update public.projects
  set style_id = 'minimal'
  where style_id = 'signature'
    and style = 'minimal';
