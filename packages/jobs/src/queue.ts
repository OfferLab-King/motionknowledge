import {PgBoss} from 'pg-boss';
import {eq} from 'drizzle-orm';
import type {Database} from '@motionknowledge/database';
import {generationJobs} from '@motionknowledge/database';
import type {JobName} from './names';
import type {JobEnvelope} from './envelope';

export interface EnqueueInput<T> {
  jobId: string;
  workspaceId: string;
  projectId: string;
  operation: JobName;
  inputHash: string;
  idempotencyKey: string;
  payload: T;
}

export interface JobQueue {
  enqueue<T>(input: EnqueueInput<T>): Promise<{id: string}>;
}

export class PgBossJobQueue implements JobQueue {
  constructor(
    private readonly boss: PgBoss,
    private readonly db: Database,
  ) {}

  async enqueue<T>(input: EnqueueInput<T>): Promise<{id: string}> {
    const existing = await this.db
      .select({id: generationJobs.id})
      .from(generationJobs)
      .where(eq(generationJobs.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing[0]) return {id: existing[0].id};

    const envelope: JobEnvelope<T> = {
      schemaVersion: 1,
      jobId: input.jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      operation: input.operation,
      inputHash: input.inputHash,
      idempotencyKey: input.idempotencyKey,
      attempt: 0,
      payload: input.payload,
    };
    const sentId = await this.boss.send(input.operation, envelope, {
      singletonKey: input.idempotencyKey,
    });
    const rows = await this.db
      .insert(generationJobs)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        operation: input.operation,
        status: 'queued',
        inputHash: input.inputHash,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload as object,
        correlationId: input.jobId,
      })
      .onConflictDoNothing({target: generationJobs.idempotencyKey})
      .returning({id: generationJobs.id});
    if (rows[0]) return {id: rows[0].id};
    const fallback = await this.db
      .select({id: generationJobs.id})
      .from(generationJobs)
      .where(eq(generationJobs.idempotencyKey, input.idempotencyKey))
      .limit(1);
    return {id: fallback[0]!.id};
  }
}

export class InProcessJobQueue implements JobQueue {
  private readonly seen = new Map<string, {id: string}>();

  async enqueue<T>(input: EnqueueInput<T>): Promise<{id: string}> {
    const existing = this.seen.get(input.idempotencyKey);
    if (existing) return existing;
    const id = input.jobId;
    this.seen.set(input.idempotencyKey, {id});
    return {id};
  }
}

export async function listJobsForProject(db: Database, projectId: string) {
  return db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId)).orderBy(
    generationJobs.createdAt,
  );
}
