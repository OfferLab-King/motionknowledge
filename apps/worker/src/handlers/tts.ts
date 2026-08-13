import {z} from 'zod';
import {and, eq, sql} from 'drizzle-orm';
import {scenes, sceneVersions, audioAssets} from '@motionknowledge/database';
import {SceneV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {enqueueNext} from './outline';

export const TtsPayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  sceneId: z.string(),
  sceneVersionId: z.string().optional(),
});

export async function handleSynthesizeTts(
  input: {payload: z.infer<typeof TtsPayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const sceneRow = await deps.db
    .select()
    .from(scenes)
    .where(and(eq(scenes.projectId, payload.projectId), eq(scenes.sceneKey, payload.sceneId)))
    .limit(1);
  const row = sceneRow[0];
  if (!row) throw new Error('Scene not found');

  const activeVersionId = payload.sceneVersionId
    ? await deps.db
        .select({id: sceneVersions.id})
        .from(sceneVersions)
        .where(and(eq(sceneVersions.projectId, payload.projectId), sql`payload->>'sceneVersionId' = ${payload.sceneVersionId}`))
        .limit(1)
        .then((rows) => rows[0]?.id)
    : row.activeSceneVersionId;
  if (!activeVersionId) throw new Error('No active scene version');

  const versionRows = await deps.db.select().from(sceneVersions).where(eq(sceneVersions.id, activeVersionId)).limit(1);
  const versionRow = versionRows[0];
  if (!versionRow) throw new Error('Scene version missing');
  const scene = SceneV1.parse(versionRow.payload);
  const projectRow = await deps.db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, payload.projectId)});
  const projectVoice = (projectRow as {voice?: string} | undefined)?.voice ?? undefined;

  const existing = await deps.db
    .select()
    .from(audioAssets)
    .where(and(eq(audioAssets.sceneId, row.id), eq(audioAssets.sceneVersionId, activeVersionId)))
    .limit(1);
  if (existing[0]) {
    await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
    return;
  }

  const synthesized = await deps.ttsService.synthesizeScene({
    sceneId: row.id,
    sceneVersionId: scene.sceneVersionId,
    narration: scene.narration,
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    idempotencyKey: input.envelope.idempotencyKey,
    voice: projectVoice,
  });

  await deps.db.insert(audioAssets).values({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    sceneId: row.id,
    sceneVersionId: activeVersionId,
    assetKey: synthesized.audioAssetKey,
    sha256: synthesized.audioAssetKey.split('/').at(-1)!.split('.').slice(0, -1).join('.'),
    durationMs: synthesized.durationMs,
    sampleRateHz: deps.config.sampleRateHz,
    provider: synthesized.provider,
    model: 'mock-beep',
    wordTimings: synthesized.wordTimings,
  });

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_CAPTIONS', {projectId: payload.projectId, sceneVersionId: scene.sceneVersionId});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
