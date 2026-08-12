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
