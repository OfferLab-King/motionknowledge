import {and, eq} from 'drizzle-orm';
import {generationJobs, projects, scenes as scenesTable, type Database} from '@motionknowledge/database';
import {getQueue} from '../lib/jobs';
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
