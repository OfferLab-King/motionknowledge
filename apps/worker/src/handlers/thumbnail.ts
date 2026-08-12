import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, renders} from '@motionknowledge/database';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {PipelinePayloadSchema} from './outline';
import {renderSceneStill} from '@motionknowledge/remotion-engine';
import {RenderManifestV1} from '@motionknowledge/schemas';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export async function handleGenerateThumbnail(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const manifestVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'RENDER_MANIFEST'});
  if (!manifestVersion) return;
  const manifest = RenderManifestV1.parse(manifestVersion.payload);

  const finalRender = await deps.db
    .select()
    .from(renders)
    .where(eq(renders.projectId, payload.projectId))
    .orderBy(renders.createdAt)
    .then((rows) => rows.filter((row) => row.kind === 'FINAL').at(-1));
  if (!finalRender) return;

  const scratch = await mkdtemp(join(tmpdir(), 'mk-thumb-'));
  const thumbnailPath = join(scratch, 'thumbnail.png');
  const coverFrame = Math.round((manifest.scenes[0]?.durationInFrames ?? 30) / 2);
  const still = await renderSceneStill(manifest, coverFrame, thumbnailPath);
  const bytes = new Uint8Array(await readFile(thumbnailPath));
  const key = `${payload.workspaceId}/${payload.projectId}/renders/final/${still.sha256.slice(0, 2)}/thumbnail.png`;
  await deps.storage.put({key, body: bytes, contentType: 'image/png', sha256: still.sha256});
  await deps.db.update(renders).set({thumbnailKey: key}).where(eq(renders.id, finalRender.id));
  await rm(scratch, {recursive: true, force: true});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
