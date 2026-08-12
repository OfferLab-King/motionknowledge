import {and, eq} from 'drizzle-orm';
import type {Database} from '@motionknowledge/database';
import {usageEvents} from '@motionknowledge/database';
import {MoneySchema, sumMoneyUsd} from './cost';

export interface UsageEventInput {
  userId?: string;
  workspaceId: string;
  projectId?: string;
  provider: string;
  model: string;
  operation: string;
  inputUnits?: string;
  outputUnits?: string;
  providerCostUsd?: string;
  computeDurationMs?: number;
  jobId?: string;
  correlationId?: string;
}

export interface UsageLedger {
  record(event: UsageEventInput): Promise<{id: string}>;
  projectCost(projectId: string, workspaceId: string): Promise<string>;
  workspaceCost(workspaceId: string): Promise<string>;
}

export class UsageLedgerImpl implements UsageLedger {
  constructor(private readonly db: Database) {}

  async record(event: UsageEventInput): Promise<{id: string}> {
    const cost = event.providerCostUsd ?? '0';
    MoneySchema.parse(cost);
    const rows = await this.db
      .insert(usageEvents)
      .values({
        workspaceId: event.workspaceId,
        projectId: event.projectId ?? null,
        userId: event.userId ?? null,
        provider: event.provider,
        model: event.model,
        operation: event.operation,
        inputUnits: event.inputUnits ?? '0',
        outputUnits: event.outputUnits ?? '0',
        providerCostUsd: cost,
        computeDurationMs: event.computeDurationMs ?? 0,
        jobId: event.jobId ?? null,
        correlationId: event.correlationId ?? null,
      })
      .returning({id: usageEvents.id});
    return {id: rows[0]!.id};
  }

  async projectCost(projectId: string, workspaceId: string): Promise<string> {
    const rows = await this.db
      .select({cost: usageEvents.providerCostUsd})
      .from(usageEvents)
      .where(and(eq(usageEvents.projectId, projectId), eq(usageEvents.workspaceId, workspaceId)));
    return sumMoneyUsd(rows.map((row) => row.cost));
  }

  async workspaceCost(workspaceId: string): Promise<string> {
    const rows = await this.db
      .select({cost: usageEvents.providerCostUsd})
      .from(usageEvents)
      .where(eq(usageEvents.workspaceId, workspaceId));
    return sumMoneyUsd(rows.map((row) => row.cost));
  }
}
