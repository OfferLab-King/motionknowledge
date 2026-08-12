import {beforeAll, describe, expect, it} from 'vitest';
import {PgBoss} from 'pg-boss';
import {
  createDatabaseClient,
  workspaces,
  projects,
  type Database,
} from '@motionknowledge/database';
import {PgBossJobQueue} from './queue';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';

let boss: PgBoss;
let queue: PgBossJobQueue;
let db: Database;
let workspaceId: string;
let projectId: string;

beforeAll(async () => {
  boss = new PgBoss({
    connectionString: DATABASE_URL,
    schema: 'boss',
    useListenNotify: false,
  });
  await boss.start();
  await boss.createQueue('GENERATE_OUTLINE');
  const client = createDatabaseClient({url: DATABASE_URL});
  db = client.db;
  queue = new PgBossJobQueue(boss, db);
  const ws = await db
    .insert(workspaces)
    .values({name: 'Idempotency workspace'})
    .returning();
  workspaceId = ws[0]!.id;
  const project = await db
    .insert(projects)
    .values({workspaceId, title: 'Idempotency project', audienceLevel: 'beginner', targetDurationSeconds: 300})
    .returning();
  projectId = project[0]!.id;
  return async () => {
    await boss.stop();
  };
}, 30_000);

describe('job idempotency', () => {
  it('returns one durable job for one idempotency key', async () => {
    const base = {
      jobId: 'job-1',
      workspaceId,
      projectId,
      operation: 'GENERATE_OUTLINE' as const,
      inputHash: 'c'.repeat(64),
      payload: {projectId},
    };
    const key = [workspaceId, projectId, 'GENERATE_OUTLINE', base.inputHash].join('|');
    const first = await queue.enqueue({...base, idempotencyKey: key});
    const second = await queue.enqueue({...base, idempotencyKey: key});
    expect(second.id).toBe(first.id);
  });
});
