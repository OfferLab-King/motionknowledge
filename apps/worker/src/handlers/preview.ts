import {z} from 'zod';
import {and, eq} from 'drizzle-orm';
import {projects, renders} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {RenderManifestV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {enqueueNext} from './outline';
import {PipelinePayloadSchema} from './outline';
import {loadActiveSceneVersions, loadAudioForScenes} from '../lib/manifest';
import {buildRenderManifest} from '@motionknowledge/remotion-engine';
import {renderProject} from '@motionknowledge/remotion-engine';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export async function handleGeneratePreview(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');
  const sceneVersions = await loadActiveSceneVersions(deps.db, payload.projectId);
  if (sceneVersions.length === 0) throw new Error('No scene versions to preview');

  const audio = await loadAudioForScenes(deps.db, payload.projectId, sceneVersions.map((scene) => scene.id));
  const manifest = buildRenderManifest({
    title: project.title,
    projectId: payload.projectId,
    sceneVersions,
    audioByScene: audio,
    width: deps.config.previewWidth,
    height: deps.config.previewHeight,
    fps: deps.config.fps,
    styleId: project.styleId ?? 'signature',
    styleVersion: project.styleVersion ?? 1,
  });
  RenderManifestV1.parse(manifest);
  const manifestHash = stableHash(manifest);

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'RENDER_MANIFEST',
    schemaVersion: 1,
    payload: manifest,
    inputHash: stableHash(manifest),
  });

  const scratch = await mkdtemp(join(tmpdir(), 'mk-preview-'));
  const outputPath = join(scratch, 'preview.mp4');

  // Reuse: an identical manifest (same scenes, style, audio, timing) was
  // already rendered — skip the render and the QA round-trip.
  const previousPreviews = await deps.db
    .select()
    .from(renders)
    .where(and(eq(renders.projectId, payload.projectId), eq(renders.kind, 'PREVIEW')))
    .orderBy(renders.createdAt);
  const reusable = [...previousPreviews].reverse().find((row) => row.status === 'succeeded' && row.manifestHash === manifestHash);
  if (reusable) {
    // Identical render → identical QA; the previous QA_RESULT still applies.
    await deps.usage.record({
      workspaceId: payload.workspaceId,
      projectId: payload.projectId,
      provider: 'remotion',
      model: 'h264',
      operation: 'render:preview:reused',
      outputUnits: '0',
      providerCostUsd: '0',
      computeDurationMs: 0,
      correlationId: input.envelope.idempotencyKey,
    });
    await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
    return;
  }

  const renderRow = (
    await deps.db
      .insert(renders)
      .values({
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        kind: 'PREVIEW',
        status: 'rendering',
        progress: 0,
        manifestHash,
        providerCostUsd: '0',
      })
      .returning()
  )[0]!;
  let lastReported = -1;
  const output = await renderProject(manifest, outputPath, (progress) => {
    if (progress - lastReported >= 5 || progress >= 100) {
      lastReported = progress;
      void deps.db.update(renders).set({progress}).where(eq(renders.id, renderRow.id));
    }
  });
  const {attachNarration} = await import('../lib/narration');
  const finalPath = join(scratch, 'preview-narrated.mp4');
  await attachNarration(deps, manifest, outputPath, finalPath);
  const bytes = new Uint8Array(await readFile(finalPath));
  await rm(scratch, {recursive: true, force: true});
  const narratedSha = await import('node:crypto').then(({createHash}) => createHash('sha256').update(Buffer.from(bytes)).digest('hex'));
  const key = `${payload.workspaceId}/${payload.projectId}/renders/preview/${narratedSha.slice(0, 2)}/preview.mp4`;
  await deps.storage.put({key, body: bytes, contentType: 'video/mp4', sha256: narratedSha});

  await deps.db
    .update(renders)
    .set({
      status: 'succeeded',
      progress: 100,
      mp4Key: key,
      mp4Sha256: output.sha256,
      completedAt: new Date(),
    })
    .where(eq(renders.id, renderRow.id));
  await deps.db
    .update(projects)
    .set({latestPreviewRenderId: renderRow.id})
    .where(eq(projects.id, payload.projectId));

  await deps.usage.record({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    provider: 'remotion',
    model: 'h264',
    operation: 'render:preview',
    outputUnits: String(bytes.byteLength),
    providerCostUsd: '0',
    computeDurationMs: 0,
    correlationId: input.envelope.idempotencyKey,
  });

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'RUN_QA', {manifestHash});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
