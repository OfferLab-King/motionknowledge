import {and, eq} from 'drizzle-orm';
import type {Database} from '@motionknowledge/database';
import {usageEvents, creditLedger} from '@motionknowledge/database';
import {MoneySchema, sumMoneyUsd} from './cost';

/** Credits are cents: 1 USD = 100 credits. */
export function creditsForCostUsd(costUsd: string): number {
  return Math.max(0, Math.round(Number(costUsd) * 100));
}

export const FREE_CREDITS = 5000;

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
  creditBalance(workspaceId: string): Promise<number>;
  grantCredits(workspaceId: string, amountCredits: number, description: string): Promise<void>;
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
    // Every paid operation consumes credits from the workspace ledger.
    const credits = creditsForCostUsd(cost);
    if (credits > 0) {
      await this.db
        .insert(creditLedger)
        .values({
          workspaceId: event.workspaceId,
          entryType: 'consume',
          amountCredits: -credits,
          description: `${event.operation} · ${event.provider}/${event.model}`,
        })
        .returning({id: creditLedger.id});
    }
    return {id: rows[0]!.id};
  }

  async creditBalance(workspaceId: string): Promise<number> {
    const rows = await this.db
      .select({amount: creditLedger.amountCredits})
      .from(creditLedger)
      .where(eq(creditLedger.workspaceId, workspaceId));
    return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  }

  async grantCredits(workspaceId: string, amountCredits: number, description: string): Promise<void> {
    await this.db
      .insert(creditLedger)
      .values({workspaceId, entryType: 'grant', amountCredits, description})
      .returning({id: creditLedger.id});
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
