/**
 * Admin credit grant: adds credits to a workspace ledger.
 * Usage: pnpm tsx scripts/grant-credits.ts <workspace-id|user-email> <amount> [description]
 */
import {createDatabaseClient} from '@motionknowledge/database';

import {eq, sql} from 'drizzle-orm';
import {UsageLedgerImpl} from '@motionknowledge/usage';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';

async function main(): Promise<void> {
  const target = process.argv[2];
  const amount = Number(process.argv[3]);
  const description = process.argv[4] ?? 'Admin grant';
  if (!target || !Number.isFinite(amount) || amount <= 0) {
    console.error('Usage: pnpm tsx scripts/grant-credits.ts <workspace-id|user-email> <amount> [description]');
    process.exit(1);
  }
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  try {
    let workspaceId: string;
    if (target.includes('@')) {
      const rows = await db.execute(sql`select w.id from public.workspace_memberships wm join auth.users u on u.id = wm.user_id join public.workspaces w on w.id = wm.workspace_id where u.email = ${target} limit 1`);
      const row = rows[0] as {id?: string} | undefined;
      if (!row?.id) throw new Error(`No workspace found for user ${target}`);
      workspaceId = row.id;
    } else {
      workspaceId = target;
    }
    await new UsageLedgerImpl(db).grantCredits(workspaceId, Math.round(amount), description);
    const balance = await new UsageLedgerImpl(db).creditBalance(workspaceId);
    console.log(`Granted ${Math.round(amount)} credits to ${workspaceId}; new balance ${balance}`);
  } finally {
    await close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('grant-credits failed', error);
  process.exit(1);
});
