import {redirect} from 'next/navigation';
import Link from 'next/link';
import {AppShell, Button} from '@motionknowledge/ui';
import {getSessionUser} from '../../lib/supabase/auth';
import {signOutAction} from '../(auth)/actions';
import {getServiceDb} from '../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../services/projects';
import {workspaceMemberships, workspaces} from '@motionknowledge/database';
import {eq, inArray} from 'drizzle-orm';
import {WorkspaceSwitcher} from '../../components/shell/WorkspaceSwitcher';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const activeWorkspaceId = await resolveWorkspaceId(db, user.id);
  const workspaceRows = memberships.length > 0
    ? await db.select().from(workspaces).where(inArray(workspaces.id, memberships.map((membership) => membership.workspaceId)))
    : [];
  const workspaceOptions = workspaceRows.map((workspace) => ({
    workspaceId: String(workspace.id),
    name: workspace.name,
    role: memberships.find((membership) => membership.workspaceId === String(workspace.id))?.role ?? 'member',
  }));
  return (
    <AppShell
      actions={
        <>
          {workspaceOptions.length > 0 ? (
            <WorkspaceSwitcher workspaces={workspaceOptions} activeWorkspaceId={activeWorkspaceId ?? workspaceOptions[0]!.workspaceId} />
          ) : null}
          <Link href="/projects/new" className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]">
            New video
          </Link>
          <Link href="/usage" className="text-sm text-[#9fb2c8] hover:text-[#f8fafc]">
            Usage
          </Link>
          <Link href="/settings" className="text-sm text-[#9fb2c8] hover:text-[#f8fafc]">
            Settings
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="text-sm">
              Sign out
            </Button>
          </form>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
