import {z} from 'zod';
import {PgBoss} from 'pg-boss';
import type {JobName} from './names';
import type {JobEnvelope} from './envelope';

export type JobErrorKind = 'validation' | 'security' | 'transient' | 'permanent';

export class JobFailure extends Error {
  constructor(
    readonly kind: JobErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'JobFailure';
  }
}

export interface JobContext {
  correlationId: string;
  log: (fields: Record<string, unknown>) => void;
}

export interface JobHandlerDefinition<T, TResult> {
  operation: JobName;
  payloadSchema: z.ZodType<T>;
  run(input: {payload: T; envelope: JobEnvelope<T>; context: JobContext}): Promise<TResult>;
}

export function defineJobHandler<T, TResult>(definition: JobHandlerDefinition<T, TResult>) {
  return definition;
}

export async function executeHandler<T, TResult>(
  definition: JobHandlerDefinition<T, TResult>,
  envelope: JobEnvelope<T>,
  log: (fields: Record<string, unknown>) => void,
): Promise<TResult> {
  const parsed = definition.payloadSchema.safeParse(envelope.payload);
  if (!parsed.success) {
    throw new JobFailure('validation', 'INVALID_PAYLOAD', 'Job payload failed schema validation');
  }
  const context: JobContext = {
    correlationId: envelope.jobId,
    log,
  };
  return definition.run({
    payload: parsed.data,
    envelope: {...envelope, payload: parsed.data},
    context,
  });
}

export interface StartBossOptions {
  schema?: string;
}

export async function startBoss(databaseUrl: string, queue: string[], options: StartBossOptions = {}): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: databaseUrl,
    schema: options.schema ?? 'boss',
    maintenanceIntervalSeconds: 60,
    useListenNotify: false,
  });
  await boss.start();
  for (const name of [...new Set(queue)]) {
    await boss.createQueue(name, {
      retryLimit: 2,
      retryDelay: 3,
      retentionSeconds: 60 * 60 * 24 * 14,
    });
  }
  return boss;
}

export async function registerBossHandlers(
  boss: PgBoss,
  handlers: Array<{
    operation: JobName;
    handle: (job: {data: unknown; id: string}) => Promise<void>;
  }>,
): Promise<void> {
  for (const handler of handlers) {
    await boss.work(handler.operation, {localConcurrency: 4}, async (jobs) => {
      for (const job of jobs) {
        await handler.handle({data: job.data, id: job.id});
      }
    });
  }
}
