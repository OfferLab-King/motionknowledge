import {and, eq, inArray, sql} from 'drizzle-orm';
import {generationJobs, projects, renders, scenes as scenesTable, type Database} from '@motionknowledge/database';
import {getBoss, getQueue} from '../lib/jobs';
import {computeInputHash, buildIdempotencyKey, type JobName} from '@motionknowledge/jobs';

/** Project status a retried operation expects to resume from. */
export const RETRY_STATUS_BY_OPERATION: Readonly<Record<string, string | null>> = {
  RESEARCH_PROJECT: 'DRAFT',
  GENERATE_OUTLINE: 'OUTLINE_READY',
  GENERATE_SCRIPT: 'SCRIPT_READY',
  GENERATE_STORYBOARD: 'STORYBOARD_READY',
  GENERATE_SCENE: 'GENERATING',
  SYNTHESIZE_TTS: 'GENERATING',
  GENERATE_CAPTIONS: 'GENERATING',
  GENERATE_PREVIEW: 'GENERATING',
  RUN_QA: 'GENERATING',
  RENDER_FINAL: 'APPROVED',
  GENERATE_THUMBNAIL: null,
};

export async function retryJob(db: Database, input: {
  workspaceId: string;
  projectId: string;
  jobId: string;
}): Promise<{jobId: string}> {
  const job = (await db.select().from(generationJobs).where(and(eq(generationJobs.id, input.jobId), eq(generationJobs.projectId, input.projectId))))[0];
  if (!job) throw new Error('Job not found');
  if (job.status !== 'failed') throw new Error('Only failed jobs can be retried');
  const operation = job.operation as JobName;
  const queue = await getQueue();
  const nonce = `retry:${job.id}:${Date.now()}`;
  const inputHash = computeInputHash({source: job.inputHash, nonce});
  const result = await queue.enqueue({
    jobId: `${input.projectId}-${operation.toLowerCase()}-retry-${Date.now()}`,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operation,
    inputHash,
    idempotencyKey: buildIdempotencyKey({workspaceId: input.workspaceId, projectId: input.projectId, operation, inputHash, nonce}),
    payload: (job.payload ?? {}) as Record<string, unknown>,
  });
  const resetTo = RETRY_STATUS_BY_OPERATION[operation] ?? null;
  if (resetTo) {
    await db.update(projects).set({status: resetTo}).where(eq(projects.id, input.projectId));
  }
  return {jobId: result.id};
}

export async function enqueuePreviewRegeneration(db: Database, input: {
  workspaceId: string;
  projectId: string;
}): Promise<{jobId: string}> {
  const sceneRows = await db.select().from(scenesTable).where(eq(scenesTable.projectId, input.projectId));
  if (sceneRows.length === 0) throw new Error('No scenes to preview yet');
  const queue = await getQueue();
  const nonce = `preview:${Date.now()}`;
  const inputHash = computeInputHash({projectId: input.projectId, nonce});
  const result = await queue.enqueue({
    jobId: `${input.projectId}-preview-regen-${Date.now()}`,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operation: 'GENERATE_PREVIEW',
    inputHash,
    idempotencyKey: buildIdempotencyKey({workspaceId: input.workspaceId, projectId: input.projectId, operation: 'GENERATE_PREVIEW', inputHash, nonce}),
    payload: {workspaceId: input.workspaceId, projectId: input.projectId},
  });
  await db.update(projects).set({status: 'GENERATING'}).where(eq(projects.id, input.projectId));
  return {jobId: result.id};
}

/**
 * Cancel a queued render (preview or final). Jobs that already started
 * rendering cannot be interrupted; the endpoint refuses those.
 */
export async function cancelRender(db: Database, input: {
  workspaceId: string;
  projectId: string;
  renderId: string;
}): Promise<{cancelled: boolean}> {
  const row = (await db.select().from(renders).where(and(eq(renders.id, input.renderId), eq(renders.projectId, input.projectId))))[0];
  if (!row) throw new Error('Render not found');
  if (row.status !== 'rendering') throw new Error('Only in-progress renders can be cancelled');
  const operations = row.kind === 'FINAL' ? ['RENDER_FINAL'] : ['GENERATE_PREVIEW'];
  const jobs = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.projectId, input.projectId), inArray(generationJobs.operation, operations as string[])))
    .orderBy(generationJobs.createdAt);
  const job = [...jobs].reverse().find((item) => item.status === 'queued' || item.status === 'running');
  if (!job) throw new Error('No queued render job found');
  if (job.status === 'running') throw new Error('The render is already running and cannot be interrupted');

  const schema = process.env.BOSS_SCHEMA ?? 'boss';
  const boss = await getBoss();
  const idRows = await db.execute(sql.raw(`select id from ${schema}.job where name = '${job.operation}' and singleton_key = '${job.idempotencyKey}' and state in ('created', 'retry')`));
  const bossId = (idRows[0] as {id?: string} | undefined)?.id;
  if (!bossId) throw new Error('Render job no longer queued');
  await boss.cancel(job.operation, bossId);
  await db.update(generationJobs).set({status: 'cancelled'}).where(eq(generationJobs.id, job.id));
  await db.update(renders).set({status: 'cancelled'}).where(eq(renders.id, input.renderId));
  const resetTo = row.kind === 'FINAL' ? 'APPROVED' : 'READY_FOR_REVIEW';
  await db.update(projects).set({status: resetTo}).where(eq(projects.id, input.projectId));
  return {cancelled: true};
}
