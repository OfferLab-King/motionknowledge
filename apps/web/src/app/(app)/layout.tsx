import {redirect} from 'next/navigation';
import Link from 'next/link';
import {AppShell, Button} from '@motionknowledge/ui';
import {getSessionUser} from '../../lib/supabase/auth';
import {signOutAction} from '../(auth)/actions';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return (
    <AppShell
      actions={
        <>
          <Link href="/projects/new" className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]">
            New video
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
