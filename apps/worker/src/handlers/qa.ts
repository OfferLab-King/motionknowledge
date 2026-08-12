import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, renders} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {RenderManifestV1, QAResultV1} from '@motionknowledge/schemas';
import {probeVideo, detectAudioLevels, evaluateRenderQa} from '@motionknowledge/remotion-engine';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {PipelinePayloadSchema} from './outline';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export async function handleRunQa(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const manifestVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'RENDER_MANIFEST'});
  if (!manifestVersion) throw new Error('No active render manifest');
  const manifest = RenderManifestV1.parse(manifestVersion.payload);

  const previewRows = await deps.db.select().from(renders).where(eq(renders.projectId, payload.projectId)).orderBy(renders.createdAt);
  const preview = previewRows.filter((row) => row.kind === 'PREVIEW').at(-1);
  if (!preview?.mp4Key) throw new Error('No preview render to evaluate');

  const scratch = await mkdtemp(join(tmpdir(), 'mk-qa-'));
  const previewPath = join(scratch, 'preview.mp4');
  const bytes = await deps.storage.get(preview.mp4Key);
  await import('node:fs/promises').then(({writeFile}) => writeFile(previewPath, Buffer.from(bytes)));
  const probe = await probeVideo(previewPath);
  const levels = await detectAudioLevels(previewPath);
  await rm(scratch, {recursive: true, force: true});

  const qa = evaluateRenderQa(manifest, probe, levels);
  const qaResult = QAResultV1.parse({...qa, projectId: payload.projectId, renderId: preview.id});

  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'QA_RESULT',
    schemaVersion: 1,
    payload: qaResult,
    inputHash: stableHash(qaResult),
  });

  if (qaResult.passed) {
    const current = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
    if (current?.status === 'GENERATING') {
      await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'GENERATING', 'PREVIEW_READY');
      await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'PREVIEW_READY', 'READY_FOR_REVIEW');
    }
  } else {
    const current = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
    if (current?.status === 'GENERATING') {
      await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'GENERATING', 'PREVIEW_READY');
      await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'PREVIEW_READY', 'QA_FAILED');
    }
  }
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
