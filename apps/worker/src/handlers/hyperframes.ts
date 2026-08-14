import {z} from 'zod';
import {and, eq, sql} from 'drizzle-orm';
import {scenes, sceneVersions, assets} from '@motionknowledge/database';
import {SceneV1} from '@motionknowledge/schemas';
import {HyperFramesAdapter} from '@motionknowledge/hyperframes-adapter';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export const HyperframePayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  sceneId: z.string(),
  sceneVersionId: z.string(),
});

export const HYPERFRAME_DOCKER_IMAGE = 'motionknowledge-hyperframes:0.7.107';

/**
 * RENDER_HYPERFRAME: render a `hyperframes`-typed scene in the sandboxed
 * docker renderer (no network, no credentials, read-only inputs) and store the
 * resulting MP4 as a provenance-tracked asset. The Remotion fallback keeps the
 * scene playable if docker is unavailable; this job is the specialist path.
 */
export async function handleRenderHyperframe(
  input: {payload: z.infer<typeof HyperframePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const sceneRow = (await deps.db
    .select()
    .from(scenes)
    .where(and(eq(scenes.projectId, payload.projectId), eq(scenes.sceneKey, payload.sceneId))))[0];
  if (!sceneRow) throw new Error('Scene not found');
  const versionRow = (await deps.db
    .select()
    .from(sceneVersions)
    .where(and(eq(sceneVersions.projectId, payload.projectId), sql`payload->>'sceneVersionId' = ${payload.sceneVersionId}`))
    .limit(1))[0];
  if (!versionRow) throw new Error('Scene version not found');
  const scene = SceneV1.parse(versionRow.payload);
  const visual = scene.visual;
  if (visual.type !== 'hyperframes') throw new Error(`Scene ${scene.id} is not a hyperframes scene`);

  const htmlBytes = await deps.storage.get(visual.data.htmlAssetKey);
  const html = new TextDecoder().decode(htmlBytes);
  const variables = visual.data.variables ?? {};

  const adapter = new HyperFramesAdapter({dockerImage: HYPERFRAME_DOCKER_IMAGE});
  const scratch = await mkdtemp(join(tmpdir(), 'mk-hyper-'));
  try {
    await writeFile(join(scratch, 'scene.html'), html);
    await writeFile(join(scratch, 'variables.json'), JSON.stringify(variables));
    const outputDir = join(scratch, 'out');
    const result = await adapter.render(
      {
        schemaVersion: 1,
        sceneId: scene.id,
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        htmlAssetKey: visual.data.htmlAssetKey,
        variables,
        width: 640,
        height: 360,
        fps: 30,
        durationSeconds: Math.min(Math.max(scene.durationSeconds, 0.5), 3),
        timeoutSeconds: 120,
        dockerImage: HYPERFRAME_DOCKER_IMAGE,
      },
      {inputDir: scratch, outputDir},
    );
    const videoBytes = new Uint8Array(await readFile(join(outputDir, 'video.mp4')));
    const sha256 = result.videoSha256;
    const key = `${payload.workspaceId}/${payload.projectId}/hyperframes/${sha256.slice(0, 2)}/${sha256}.mp4`;
    await deps.storage.put({key, body: videoBytes, contentType: 'video/mp4', sha256});

    await deps.db
      .insert(assets)
      .values({
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        key,
        sha256,
        contentType: 'video/mp4',
        byteCount: videoBytes.byteLength,
        origin: 'generated',
        license: 'internal',
        provider: 'hyperframes',
        estimatedCostUsd: result.providerCostUsd,
      })
      .returning({id: assets.id});

    // Record usage so the specialist render is accounted for.
    await deps.usage.record({
      workspaceId: payload.workspaceId,
      projectId: payload.projectId,
      provider: 'hyperframes',
      model: HYPERFRAME_DOCKER_IMAGE,
      operation: 'render:hyperframe',
      outputUnits: String(videoBytes.byteLength),
      providerCostUsd: result.providerCostUsd,
      computeDurationMs: 0,
      correlationId: input.envelope.idempotencyKey,
    });

    await deps.db
      .update(scenes)
      .set({status: 'SUCCEEDED'})
      .where(eq(scenes.id, sceneRow.id));
  } finally {
    await rm(scratch, {recursive: true, force: true});
  }
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
