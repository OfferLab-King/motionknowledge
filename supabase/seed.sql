-- Seed a demo workspace-less subscription scaffold. The application creates
-- workspaces and memberships on first signup; nothing is seeded here because
-- fixtures create their own tenants.
insert into public.subscriptions (workspace_id, status, plan)
select w.id, 'free', 'free'
from public.workspaces w
on conflict (workspace_id) do nothing;
