import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, renders} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {RenderManifestV1, CaptionTrackV1, ScriptV1, YouTubeMetadataV1, RenderResultV1} from '@motionknowledge/schemas';
import {renderProject, renderSceneStill, probeVideo} from '@motionknowledge/remotion-engine';
import {toSrt, toTranscript} from '@motionknowledge/captions';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {PipelinePayloadSchema, enqueueNext} from './outline';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sha256Hex} from '@motionknowledge/assets';
import {loadActiveSceneVersions, loadAudioForScenes, buildRenderManifest, groupSceneCaptions} from '../lib/manifest';

export async function handleRenderFinal(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const manifestVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'RENDER_MANIFEST'});
  if (!manifestVersion) throw new Error('No active render manifest');
  const previewManifest = RenderManifestV1.parse(manifestVersion.payload);

  const {loadActiveSceneVersions, loadAudioForScenes, buildRenderManifest} = await import('../lib/manifest');
  const sceneVersions = await loadActiveSceneVersions(deps.db, payload.projectId);
  const audio = await loadAudioForScenes(deps.db, payload.projectId, sceneVersions.map((scene) => scene.id));
  const manifest = buildRenderManifest({
    title: previewManifest.title,
    projectId: payload.projectId,
    sceneVersions,
    audioByScene: audio,
    width: deps.config.renderWidth,
    height: deps.config.renderHeight,
    fps: deps.config.fps,
  });
  RenderManifestV1.parse(manifest);

  const captionVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'CAPTIONS'});
  const captionTrack = captionVersion ? CaptionTrackV1.parse(captionVersion.payload) : null;
  const scriptVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'SCRIPT'});
  const script = scriptVersion ? ScriptV1.parse(scriptVersion.payload) : null;
  const metadataVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'YOUTUBE_METADATA'});
  let metadata = metadataVersion ? YouTubeMetadataV1.parse(metadataVersion.payload) : null;
  if (!metadata) {
    try {
      metadata = await deps.contentPipeline.generateYouTubeMetadata(
        {projectTitle: project.title, scriptPreview: script?.chapters[0]?.title ?? '', transcriptPreview: ''},
        {workspaceId: payload.workspaceId, projectId: payload.projectId, correlationId: input.envelope.idempotencyKey},
      );
      await repo.promoteVersion({
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        artifactType: 'YOUTUBE_METADATA',
        schemaVersion: 1,
        payload: metadata,
        inputHash: stableHash(metadata),
      });
    } catch (error) {
      deps.logger.warn('metadata generation failed, using defaults', {projectId: payload.projectId, error: String(error)});
    }
  }

  const scratch = await mkdtemp(join(tmpdir(), 'mk-final-'));
  const videoPath = join(scratch, 'final.mp4');
  await renderProject(manifest, videoPath);
  const {attachNarration} = await import('../lib/narration');
  const finalVideoPath = join(scratch, 'final-narrated.mp4');
  await attachNarration(deps, manifest, videoPath, finalVideoPath);
  const videoBytes = new Uint8Array(await readFile(finalVideoPath));
  const videoSha256 = sha256Hex(videoBytes);
  const probe = await probeVideo(finalVideoPath);

  const videoKey = `${payload.workspaceId}/${payload.projectId}/renders/final/${videoSha256.slice(0, 2)}/video.mp4`;
  await deps.storage.put({key: videoKey, body: videoBytes, contentType: 'video/mp4', sha256: videoSha256});

  const srtText = captionTrack ? toSrt(captionTrack.segments) : '';
  const transcript = captionTrack ? toTranscript(captionTrack.segments) : '';
  const srtKey = await storeText(deps, payload, 'final/srt', srtText, 'text/plain; charset=utf-8', scratch);
  const transcriptKey = await storeText(deps, payload, 'final/transcript', transcript, 'text/plain; charset=utf-8', scratch);
  const chaptersText = script
    ? script.chapters.map((chapter, index) => `Chapter ${index + 1}: ${chapter.title}`).join('\n')
    : '';
  const chaptersKey = await storeText(deps, payload, 'final/chapters', chaptersText, 'text/plain; charset=utf-8', scratch);
  const metadataJson = JSON.stringify(metadata ?? {schemaVersion: 1, projectId: payload.projectId, title: project.title, description: '', tags: [], category: 'Education'}, null, 2);
  const metadataKey = await storeText(deps, payload, 'final/metadata', metadataJson, 'application/json', scratch);

  let thumbnailKey: string | null = null;
  try {
    const thumbnailPath = join(scratch, 'thumbnail.png');
    const coverFrame = Math.round((manifest.scenes[0]?.durationInFrames ?? 30) / 2);
    const still = await renderSceneStill(manifest, coverFrame, thumbnailPath);
    const stillBytes = new Uint8Array(await readFile(thumbnailPath));
    thumbnailKey = `${payload.workspaceId}/${payload.projectId}/renders/final/${still.sha256.slice(0, 2)}/thumbnail.png`;
    await deps.storage.put({key: thumbnailKey, body: stillBytes, contentType: 'image/png', sha256: still.sha256});
  } catch (error) {
    deps.logger.warn('thumbnail render failed', {projectId: payload.projectId, error: String(error)});
  }

  const renderResult = RenderResultV1.parse({
    schemaVersion: 1,
    renderId: 'render-' + videoSha256.slice(0, 12),
    mp4Key: videoKey,
    mp4Sha256: videoSha256,
    srtKey: srtKey ?? '',
    transcriptKey: transcriptKey ?? '',
    thumbnailKey: thumbnailKey ?? '',
    chaptersKey: chaptersKey ?? '',
    metadataKey: metadataKey ?? '',
    durationSeconds: probe.durationSeconds,
    width: probe.width,
    height: probe.height,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec ?? '',
    outputFps: probe.fps,
    providerCostUsd: '0',
  });

  const renderRow = await deps.db
    .insert(renders)
    .values({
      workspaceId: payload.workspaceId,
      projectId: payload.projectId,
      kind: 'FINAL',
      status: 'succeeded',
      mp4Key: videoKey,
      mp4Sha256: videoSha256,
      srtKey: srtKey ?? null,
      transcriptKey: transcriptKey ?? null,
      thumbnailKey,
      chaptersKey: chaptersKey ?? null,
      metadataKey: metadataKey ?? null,
      durationSeconds: Math.round(probe.durationSeconds),
      width: probe.width,
      height: probe.height,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      fps: Math.round(probe.fps),
      providerCostUsd: '0',
      completedAt: new Date(),
    })
    .returning();
  await deps.db
    .update(projects)
    .set({latestRenderResultId: renderRow[0]!.id})
    .where(eq(projects.id, payload.projectId));

  await deps.usage.record({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    provider: 'remotion',
    model: 'h264',
    operation: 'render:final',
    outputUnits: String(videoBytes.byteLength),
    providerCostUsd: '0',
    computeDurationMs: 0,
    correlationId: input.envelope.idempotencyKey,
  });

  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'APPROVED', 'RENDERING');
  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'RENDERING', 'COMPLETE');
  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_THUMBNAIL', {projectId: payload.projectId});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
  await rm(scratch, {recursive: true, force: true});
}

async function storeText(deps: WorkerDeps, payload: {workspaceId: string; projectId: string}, kind: string, text: string, contentType: string, scratch: string): Promise<string> {
  const sha256 = sha256Hex(new TextEncoder().encode(text));
  const key = `${payload.workspaceId}/${payload.projectId}/renders/${kind}/${sha256.slice(0, 2)}/${kind}.txt`;
  await deps.storage.put({key, body: new TextEncoder().encode(text), contentType, sha256});
  return key;
}
