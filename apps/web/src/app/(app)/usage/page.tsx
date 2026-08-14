import {getSessionUser} from '../../../lib/supabase/auth';
import {getServiceDb} from '../../../lib/db';
import {resolveWorkspaceId} from '../../../services/projects';
import {usageEvents, creditLedger} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';
import {UsageLedgerImpl} from '@motionknowledge/usage';

export default async function UsagePage() {
  const user = await getSessionUser();
  const db = getServiceDb();
  const workspaceId = user ? await resolveWorkspaceId(db, user.id) : null;
  const events = workspaceId ? await db.select().from(usageEvents).where(eq(usageEvents.workspaceId, workspaceId)) : [];
  const ledger = workspaceId ? await new UsageLedgerImpl(db).creditBalance(workspaceId) : 0;

  const byOperation = new Map<string, {costUsd: number; count: number; credits: number}>();
  let totalCost = 0;
  let totalEvents = 0;
  for (const event of events) {
    const cost = Number(event.providerCostUsd);
    totalCost += cost;
    totalEvents += 1;
    const entry = byOperation.get(event.operation) ?? {costUsd: 0, count: 0, credits: 0};
    entry.costUsd += cost;
    entry.count += 1;
    entry.credits += Math.max(0, Math.round(cost * 100));
    byOperation.set(event.operation, entry);
  }
  const rows = [...byOperation.entries()].map(([operation, value]) => ({operation, ...value})).sort((a, b) => b.costUsd - a.costUsd);
  const maxCost = Math.max(...rows.map((row) => row.costUsd), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-[#f8fafc]">Usage</h1>
      <p className="mb-8 text-sm text-[#9fb2c8]">Cost accounting for the active workspace.</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2a4568] bg-[#0f1c30] p-4">
          <div className="text-xs text-[#9fb2c8]">Credit balance</div>
          <div className="mt-1 text-2xl font-bold text-[#59d5e0]">{ledger.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[#2a4568] bg-[#0f1c30] p-4">
          <div className="text-xs text-[#9fb2c8]">Total cost</div>
          <div className="mt-1 text-2xl font-bold text-[#f8fafc]">${totalCost.toFixed(4)}</div>
        </div>
        <div className="rounded-xl border border-[#2a4568] bg-[#0f1c30] p-4">
          <div className="text-xs text-[#9fb2c8]">Operations</div>
          <div className="mt-1 text-2xl font-bold text-[#f8fafc]">{totalEvents}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[#9fb2c8]">No usage recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.operation} className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#f8fafc]">{row.operation.replace(/_/g, ' ')}</span>
                <span className="shrink-0 text-xs text-[#9fb2c8]">
                  {row.count} ops · {row.credits} credits · ${row.costUsd.toFixed(4)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0a1526]">
                <div className="h-full rounded-full bg-[#59d5e0]" style={{width: `${maxCost > 0 ? (row.costUsd / maxCost) * 100 : 0}%`}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
