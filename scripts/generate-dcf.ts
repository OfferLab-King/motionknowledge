/**
 * Creates the DCF reference project (DRAFT) with its supplied source and
 * enqueues the generation pipeline, then waits for READY_FOR_REVIEW.
 * Usage: pnpm dcf:generate
 */
import {createDatabaseClient, workspaces, workspaceMemberships, projects, sources} from '@motionknowledge/database';
import {sha256Hex, hashText} from '@motionknowledge/assets';
import {buildWorkerDeps, attachQueue} from '../apps/worker/src/deps';
import {startBoss, PgBossJobQueue, JOB_NAMES} from '@motionknowledge/jobs';
import {attachBossHandlers} from '../apps/worker/src/register';
import {DCF_TOPIC, DCF_SOURCE_TEXT} from '../packages/testkit/src/fixtures/dcf';
import {eq} from 'drizzle-orm';

const env = process.env;
const DATABASE_URL = env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';

async function main(): Promise<void> {
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  try {
    const ws = await db.insert(workspaces).values({name: 'DCF Demo Workspace'}).onConflictDoNothing().returning();
    let workspaceId = ws[0]?.id;
    if (!workspaceId) {
      workspaceId = (await db.select().from(workspaces).limit(1))[0]!.id;
    }
    const project = await db
      .insert(projects)
      .values({
        workspaceId,
        title: DCF_TOPIC,
        audienceLevel: 'beginner',
        targetDurationSeconds: 300,
        language: 'en',
        tone: 'professional',
        style: 'professional',
        aspectRatio: '16:9',
      })
      .returning();
    const projectRow = project[0]!;

    const rawBytes = new TextEncoder().encode(DCF_SOURCE_TEXT);
    await db
      .insert(sources)
      .values({
        projectId: projectRow.id,
        workspaceId,
        kind: 'text',
        title: 'Discounted Cash Flow — Educator Reference',
        rawSha256: sha256Hex(rawBytes),
        normalizedSha256: hashText(DCF_SOURCE_TEXT),
        originalUrl: null,
        fetchedAt: null,
        language: 'en',
        byteCount: rawBytes.length,
        status: 'PROCESSED',
      })
      .onConflictDoNothing();

    console.log(`DCF project created: ${projectRow.id} (workspace ${workspaceId})`);
    await close();

    const deps = buildWorkerDeps(env);
    const boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES]);
    attachQueue(deps, new PgBossJobQueue(boss, deps.db));
    await attachBossHandlers(boss, deps);
    await deps.queue.enqueue({
      jobId: `${projectRow.id}-research`,
      workspaceId,
      projectId: projectRow.id,
      operation: 'RESEARCH_PROJECT',
      inputHash: '0'.repeat(64),
      idempotencyKey: `dcf|${projectRow.id}|research`,
      payload: {workspaceId, projectId: projectRow.id},
    });
    console.log('Generation pipeline enqueued; waiting for READY_FOR_REVIEW...');
    const deadline = Date.now() + 240_000;
    while (Date.now() < deadline) {
      const row = await deps.db.query.projects.findFirst({where: eq(projects.id, projectRow.id)});
      if (row?.status === 'READY_FOR_REVIEW') {
        console.log('DCF project is READY_FOR_REVIEW');
        await boss.stop();
        process.exit(0);
      }
      if (row?.status === 'QA_FAILED') {
        console.error('DCF project failed QA');
        await boss.stop();
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.error('Timed out waiting for READY_FOR_REVIEW');
    await boss.stop();
    process.exit(1);
  } finally {
    await close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('dcf:generate failed', error);
  process.exit(1);
});
