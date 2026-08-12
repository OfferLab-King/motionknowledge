import {z} from 'zod';
import {stableHash} from '@motionknowledge/schemas/hash';
import {CaptionTrackV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded} from '../lib/helpers';
import {enqueueNext} from './outline';
import {PipelinePayloadSchema} from './outline';
import {loadActiveSceneVersions, loadAudioForScenes, buildCaptionTrack} from '../lib/manifest';

export async function handleGenerateCaptions(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const sceneVersions = await loadActiveSceneVersions(deps.db, payload.projectId);
  const audio = await loadAudioForScenes(deps.db, payload.projectId, sceneVersions.map((scene) => scene.id));
  const {groupSceneCaptions} = await import('../lib/manifest');
  const segmentsPerScene: Array<{sceneId: string; segments: Array<{schemaVersion: 1; sceneId: string; index: number; startMs: number; endMs: number; text: string; words: Array<{text: string; startMs: number; endMs: number; confidence: number | null}>}>}> = sceneVersions.map((scene) => {
    const wordTimings = audio.get(scene.id)?.wordTimings ?? [];
    return {
      sceneId: scene.id,
      segments: wordTimings.length > 0
        ? groupSceneCaptions(wordTimings).map((group) => ({
            schemaVersion: 1,
            sceneId: scene.id,
            index: 0,
            startMs: group.startMs,
            endMs: group.endMs,
            text: group.text,
            words: [],
          }))
        : [],
    };
  });
  const track = buildCaptionTrack(payload.projectId, segmentsPerScene);
  const captionTrack = CaptionTrackV1.parse({
    schemaVersion: 1,
    projectId: payload.projectId,
    segments: track,
    inputHash: stableHash(track),
  });

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'CAPTIONS',
    schemaVersion: 1,
    payload: captionTrack,
    inputHash: captionTrack.inputHash,
  });

  const {loadStoryboard} = await import('../lib/manifest');
  const storyboard = await loadStoryboard(deps.db, payload.projectId, payload.workspaceId);
  const storyboardSceneIds = new Set(storyboard.scenes.map((scene) => scene.id));
  const coveredSceneIds = new Set(sceneVersions.map((scene) => scene.id));
  const allScenesVersioned = [...storyboardSceneIds].every((id) => coveredSceneIds.has(id));
  const allScenesSpoken = [...storyboardSceneIds].every((id) => audio.has(id) && audio.get(id)!.wordTimings.length > 0);
  if (allScenesVersioned && allScenesSpoken) {
    const sceneStateHash = stableHash(sceneVersions.map((scene) => `${scene.sceneVersionId}:${scene.inputHash}`));
    await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_PREVIEW', {projectId: payload.projectId, sceneStateHash});
  }
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
