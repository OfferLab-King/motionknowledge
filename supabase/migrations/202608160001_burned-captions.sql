-- Burned captions toggle: captions are styled by the style's caption
-- treatment tokens and rendered into the video.
alter table public.projects
  add column if not exists burned_captions boolean not null default true;
