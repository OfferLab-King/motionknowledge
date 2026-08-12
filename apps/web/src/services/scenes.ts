import {eq} from 'drizzle-orm';
import {projects, scenes, type Database} from '@motionknowledge/database';
import {getQueue} from '../lib/jobs';
import {hashText} from '@motionknowledge/assets';
import {computeInputHash, buildIdempotencyKey} from '@motionknowledge/jobs';

export async function enqueueSceneRegeneration(db: Database, input: {
  workspaceId: string;
  projectId: string;
  sceneKey: string;
  patch: {title?: string; narration?: string; durationSeconds?: number};
}): Promise<{jobId: string}> {
  const project = (await db.select().from(projects).where(eq(projects.id, input.projectId)))[0];
  if (!project) throw new Error('Project not found');
  const sceneRow = (await db.select().from(scenes).where(eq(scenes.sceneKey, input.sceneKey)))[0];
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

export async function authorizeProject(db: Database, projectId: string, workspaceId: string): Promise<boolean> {
  const row = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];
  return Boolean(row && String(row.workspaceId) === workspaceId);
}
