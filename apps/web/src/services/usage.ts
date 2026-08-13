import {eq} from 'drizzle-orm';
import {usageEvents, type Database} from '@motionknowledge/database';

export async function getProjectUsage(db: Database, projectId: string, workspaceId: string) {
  const rows = await db
    .select()
    .from(usageEvents)
    .where(eq(usageEvents.projectId, projectId));
  let total = 0;
  const byOperation = new Map<string, number>();
  for (const row of rows) {
    const cost = Number(row.providerCostUsd);
    total += cost;
    byOperation.set(row.operation, (byOperation.get(row.operation) ?? 0) + cost);
  }
  return {
    totalCostUsd: total.toFixed(6),
    byOperation: [...byOperation.entries()].map(([operation, cost]) => ({operation, costUsd: cost.toFixed(6)})),
    eventCount: rows.length,
  };
}
