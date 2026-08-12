import {eq} from 'drizzle-orm';
import {scenes, sceneVersions, audioAssets, type Database} from '@motionknowledge/database';
import {StoryboardV1, SceneV1, type CaptionSegment, type RenderManifest, type Scene, type Storyboard, type TimedWord} from '@motionknowledge/schemas';
import {groupCaptions} from '@motionknowledge/captions';
import {professionalTheme} from '@motionknowledge/visual-library';

export async function loadStoryboard(db: Database, projectId: string, workspaceId: string): Promise<Storyboard> {
  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(db);
  const version = await repo.getActiveVersion({projectId, workspaceId, artifactType: 'STORYBOARD'});
  if (!version) throw new Error('No active storyboard');
  return StoryboardV1.parse(version.payload);
}

export async function loadActiveSceneVersions(db: Database, projectId: string): Promise<Scene[]> {
  const sceneRows = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.index);
  const versionRows = await db.select().from(sceneVersions).where(eq(sceneVersions.projectId, projectId));
  const result: Scene[] = [];
  for (const sceneRow of sceneRows) {
    const version = sceneRow.activeSceneVersionId
      ? versionRows.find((v) => String(v.id) === String(sceneRow.activeSceneVersionId))
      : versionRows.find((v) => String(v.sceneId) === String(sceneRow.id));
    if (!version) continue;
    result.push(SceneV1.parse(version.payload));
  }
  return result;
}

export async function loadAudioForScenes(db: Database, projectId: string, sceneKeys: string[]): Promise<Map<string, {wordTimings: TimedWord[]; assetKey: string}>> {
  const sceneRows = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
  const keyByRowId = new Map(sceneRows.map((row) => [String(row.id), row.sceneKey]));
  const rows = await db.select().from(audioAssets).where(eq(audioAssets.projectId, projectId));
  const byScene = new Map<string, {wordTimings: TimedWord[]; assetKey: string}>();
  for (const row of rows) {
    if (row.sceneId) {
      const sceneKey = keyByRowId.get(String(row.sceneId));
      if (sceneKey && sceneKeys.includes(sceneKey)) {
        byScene.set(sceneKey, {wordTimings: row.wordTimings as TimedWord[], assetKey: row.assetKey});
      }
    }
  }
  return byScene;
}

export function groupSceneCaptions(wordTimings: TimedWord[]): Array<{startMs: number; endMs: number; text: string}> {
  return groupCaptions(wordTimings, {maxWords: 7, maxDurationMs: 3200, maxCharsPerLine: 80}).map((group) => ({
    startMs: group.startMs,
    endMs: group.endMs,
    text: group.text,
  }));
}

export interface RenderManifestInput {
  title: string;
  projectId: string;
  sceneVersions: Scene[];
  audioByScene: Map<string, {wordTimings: TimedWord[]; assetKey: string}>;
  width: number;
  height: number;
  fps: 30;
}

export function buildRenderManifest(input: RenderManifestInput): RenderManifest {
  const fps = input.fps;
  let cursor = 0;
  const renderScenes = input.sceneVersions.map((scene) => {
    const audio = input.audioByScene.get(scene.id);
    const lastWordEndMs = audio && audio.wordTimings.length > 0 ? audio.wordTimings.at(-1)!.endMs : 0;
    const narrationSeconds = lastWordEndMs > 0 ? Math.ceil(lastWordEndMs / 1000) + 1 : 0;
    const durationSeconds = Math.max(scene.durationSeconds, narrationSeconds + 1);
    const durationInFrames = Math.round(durationSeconds * fps);
    const startFrame = cursor;
    cursor += durationInFrames;
    const captionSegments = audio && audio.wordTimings.length > 0 ? groupSceneCaptions(audio.wordTimings) : [];
    return {
      sceneVersionId: scene.sceneVersionId,
      sceneId: scene.id,
      title: scene.title,
      index: scene.index,
      startFrame,
      durationInFrames,
      fps,
      narrationAudioKey: audio?.assetKey ?? null,
      narrationStartMs: 0,
      captionSegments,
      visual: scene.visual,
      inputHash: scene.inputHash,
    };
  });
  return {
    schemaVersion: 1,
    id: `manifest-${input.projectId}`,
    projectId: input.projectId,
    title: input.title,
    width: input.width,
    height: input.height,
    fps,
    totalDurationInFrames: cursor,
    theme: {
      background: professionalTheme.colors.background,
      surface: professionalTheme.colors.surface,
      primary: professionalTheme.colors.primary,
      accent: professionalTheme.colors.accent,
      text: professionalTheme.colors.text,
      muted: professionalTheme.colors.muted,
      danger: professionalTheme.colors.danger,
      safeAreaX: professionalTheme.safeArea.x,
      safeAreaY: professionalTheme.safeArea.y,
    },
    scenes: renderScenes,
    audioTracks: renderScenes
      .filter((scene) => scene.narrationAudioKey)
      .map((scene) => ({
        key: scene.narrationAudioKey!,
        sceneVersionId: scene.sceneVersionId,
        offsetMs: Math.round((scene.startFrame / fps) * 1000),
      })),
    musicTrackKey: null,
    inputHash: '0'.repeat(64),
  };
}

export function buildCaptionTrack(projectId: string, scenesWithCaptions: Array<{sceneId: string; segments: CaptionSegment[]}>): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let index = 0;
  for (const item of scenesWithCaptions) {
    for (const segment of item.segments) {
      segments.push({...segment, sceneId: item.sceneId, index: index++});
    }
  }
  return segments;
}
