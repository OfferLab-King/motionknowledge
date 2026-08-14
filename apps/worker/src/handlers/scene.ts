import {z} from 'zod';
import {and, eq} from 'drizzle-orm';
import {scenes, sceneVersions} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {SceneV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {enqueueNext} from './outline';

export const ScenePayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  sceneId: z.string(),
  patch: z.object({
    title: z.string().optional(),
    narration: z.string().optional(),
    durationSeconds: z.number().optional(),
    visual: z.unknown().optional(),
  }).optional(),
});

export async function handleGenerateScene(
  input: {payload: z.infer<typeof ScenePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const sceneRow = await deps.db
    .select()
    .from(scenes)
    .where(and(eq(scenes.projectId, payload.projectId), eq(scenes.sceneKey, payload.sceneId)))
    .limit(1);
  const row = sceneRow[0];
  if (!row) throw new Error('Scene not found');

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const storyboardVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'STORYBOARD'});
  if (!storyboardVersion) throw new Error('No active storyboard');
  const storyboard = storyboardVersion.payload as {scenes: Array<Record<string, unknown>>};
  const storyboardScene = storyboard.scenes.find((scene) => scene.id === payload.sceneId);
  if (!storyboardScene) throw new Error(`Scene ${payload.sceneId} missing from storyboard`);

  const base = SceneV1.parse(storyboardScene);
  const existingVersions = await deps.db
    .select()
    .from(sceneVersions)
    .where(and(eq(sceneVersions.sceneId, row.id), eq(sceneVersions.projectId, payload.projectId)));
  const versionNumbers = existingVersions
    .map((v) => {
      const payloadValue = v.payload as {sceneVersionId?: string};
      const match = payloadValue.sceneVersionId?.match(/-v(\d+)$/);
      return match ? Number(match[1]) : 1;
    })
    .filter((n) => Number.isFinite(n));
  const versionNumber = Math.max(...versionNumbers, 0) + 1;

  const scene = {
    ...base,
    title: payload.patch?.title ?? base.title,
    narration: payload.patch?.narration ?? base.narration,
    durationSeconds: payload.patch?.durationSeconds ?? base.durationSeconds,
    visual: payload.patch?.visual ?? base.visual,
    sceneVersionId: `${base.id}-v${versionNumber}`,
    inputHash: stableHash({
      id: base.id,
      title: payload.patch?.title ?? base.title,
      narration: payload.patch?.narration ?? base.narration,
      durationSeconds: payload.patch?.durationSeconds ?? base.durationSeconds,
      visual: payload.patch?.visual ?? base.visual,
      versionNumber,
    }),
  };
  SceneV1.parse(scene);

  const inserted = await deps.db
    .insert(sceneVersions)
    .values({
      sceneId: row.id,
      projectId: payload.projectId,
      workspaceId: payload.workspaceId,
      schemaVersion: 1,
      payload: scene,
      inputHash: scene.inputHash,
      provider: deps.llm.provider,
      costUsd: '0',
    })
    .returning();
  const versionId = inserted[0]!.id;
  await deps.db
    .update(scenes)
    .set({activeSceneVersionId: versionId, status: 'SUCCEEDED', title: scene.title})
    .where(eq(scenes.id, row.id));

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'SYNTHESIZE_TTS', {sceneId: payload.sceneId, sceneVersionId: scene.sceneVersionId}, {sceneId: payload.sceneId, sceneVersionId: scene.sceneVersionId});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
