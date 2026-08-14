import {and, eq} from 'drizzle-orm';
import {projects, scenes, type Database} from '@motionknowledge/database';
import {getQueue} from '../lib/jobs';
import {hashText} from '@motionknowledge/assets';
import {computeInputHash, buildIdempotencyKey, type JobName} from '@motionknowledge/jobs';

export async function enqueueSceneRegeneration(db: Database, input: {
  workspaceId: string;
  projectId: string;
  sceneKey: string;
  patch: {title?: string; narration?: string; durationSeconds?: number; visual?: {visualId: string}};
}): Promise<{jobId: string}> {
  const project = (await db.select().from(projects).where(eq(projects.id, input.projectId)))[0];
  if (!project) throw new Error('Project not found');
  const sceneRow = (await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, input.sceneKey))))[0];
  if (!sceneRow) throw new Error('Scene not found');
  const queue = await getQueue();
  const inputHash = computeInputHash({sceneId: input.sceneKey, patch: input.patch});
  const result = await queue.enqueue({
    jobId: `${input.projectId}-scene-${input.sceneKey}`,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operation: 'GENERATE_SCENE',
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      operation: 'GENERATE_SCENE',
      inputHash,
      nonce: `${input.sceneKey}:${hashText(JSON.stringify(input.patch))}`,
    }),
    payload: {workspaceId: input.workspaceId, projectId: input.projectId, sceneId: input.sceneKey, patch: input.patch},
  });
  return {jobId: result.id};
}

/** Regenerate narration for a scene's active version (forces TTS). */
export async function enqueueSceneNarration(db: Database, input: {
  workspaceId: string;
  projectId: string;
  sceneKey: string;
}): Promise<{jobId: string}> {
  const sceneRow = (await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, input.sceneKey))))[0];
  if (!sceneRow) throw new Error('Scene not found');
  const {sceneVersionId} = await import('@motionknowledge/schemas').then(async ({SceneV1}) => {
    if (!sceneRow.activeSceneVersionId) throw new Error('No active scene version');
    const {sceneVersions} = await import('@motionknowledge/database');
    const version = (await db.select().from(sceneVersions).where(eq(sceneVersions.id, sceneRow.activeSceneVersionId)))[0];
    if (!version) throw new Error('No active scene version');
    return {sceneVersionId: SceneV1.parse(version.payload).sceneVersionId};
  });
  const queue = await getQueue();
  const inputHash = computeInputHash({sceneId: input.sceneKey, sceneVersionId, force: true});
  const result = await queue.enqueue({
    jobId: `${input.projectId}-tts-${input.sceneKey}-${Date.now()}`,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operation: 'SYNTHESIZE_TTS',
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      operation: 'SYNTHESIZE_TTS',
      inputHash,
      nonce: `${input.sceneKey}:${sceneVersionId}:${hashText(String(Date.now()))}`,
    }),
    payload: {workspaceId: input.workspaceId, projectId: input.projectId, sceneId: input.sceneKey, sceneVersionId, force: true},
  });
  return {jobId: result.id};
}

/** Enqueue the pipeline job that consumes a just-promoted artifact. */
export async function enqueueArtifactDownstream(db: Database, input: {
  workspaceId: string;
  projectId: string;
  artifactType: 'LESSON_PLAN' | 'SCRIPT' | 'STORYBOARD';
  payload: unknown;
}): Promise<{jobId: string | null; count?: number}> {
  const queue = await getQueue();
  const queueJob = async (operation: JobName, key: string, value: unknown, extra: Record<string, unknown> = {}) => {
    const inputHash = computeInputHash({key, value});
    const result = await queue.enqueue({
      jobId: `${input.projectId}-${operation.toLowerCase()}`,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      operation,
      inputHash,
      idempotencyKey: buildIdempotencyKey({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        operation,
        inputHash,
        nonce: hashText(JSON.stringify(value)),
      }),
      payload: {workspaceId: input.workspaceId, projectId: input.projectId, ...extra},
    });
    return result.id;
  };
  if (input.artifactType === 'LESSON_PLAN') {
    return {jobId: await queueJob('GENERATE_SCRIPT', 'lesson-plan', input.payload)};
  }
  if (input.artifactType === 'SCRIPT') {
    return {jobId: await queueJob('GENERATE_STORYBOARD', 'script', input.payload)};
  }
  const storyboard = input.payload as {scenes?: Array<{id: string}>};
  const scenesList = storyboard.scenes ?? [];
  let firstJob: string | null = null;
  for (const scene of scenesList) {
    const jobId = await queueJob('GENERATE_SCENE', 'storyboard-scene', scene.id, {sceneId: scene.id});
    if (!firstJob) firstJob = jobId;
  }
  return {jobId: firstJob, count: scenesList.length};
}

export async function authorizeProject(db: Database, projectId: string, workspaceId: string): Promise<boolean> {
  const row = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];
  return Boolean(row && String(row.workspaceId) === workspaceId);
}
