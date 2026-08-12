import {and, eq} from 'drizzle-orm';
import {scenes, sceneVersions, generationJobs, renders, type Database} from '@motionknowledge/database';
import {ArtifactRepositoryImpl, type ArtifactType} from '@motionknowledge/database';
import {SceneV1, type Scene} from '@motionknowledge/schemas';
import {stableHash} from '@motionknowledge/schemas/hash';

export async function getActiveArtifact<T>(db: Database, projectId: string, workspaceId: string, artifactType: ArtifactType): Promise<T | null> {
  const repo = new ArtifactRepositoryImpl(db);
  const version = await repo.getActiveVersion({projectId, workspaceId, artifactType});
  return version ? (version.payload as T) : null;
}

export async function listScenes(db: Database, projectId: string): Promise<Array<{scene: Scene; versionNumber: number; status: string}>> {
  const rows = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.index);
  const versions = await db.select().from(sceneVersions).where(eq(sceneVersions.projectId, projectId));
  const result: Array<{scene: Scene; versionNumber: number; status: string}> = [];
  for (const row of rows) {
    const active = row.activeSceneVersionId
      ? versions.find((v) => String(v.id) === String(row.activeSceneVersionId))
      : versions.find((v) => String(v.sceneId) === String(row.id));
    if (!active) continue;
    const scene = SceneV1.parse(active.payload);
    const match = scene.sceneVersionId.match(/-v(\d+)$/);
    result.push({scene, versionNumber: match ? Number(match[1]) : 1, status: row.status});
  }
  return result;
}

export async function getSceneVersionCount(db: Database, sceneId: string): Promise<number> {
  const rows = await db.select({id: sceneVersions.id}).from(sceneVersions).where(eq(sceneVersions.sceneId, sceneId));
  return rows.length;
}

export async function applySceneEdit(db: Database, input: {
  projectId: string;
  workspaceId: string;
  sceneKey: string;
  patch: {title?: string; narration?: string; durationSeconds?: number};
}): Promise<Scene> {
  const row = (await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, input.sceneKey))))[0];
  if (!row) throw new Error('Scene not found');
  const activeVersion = row.activeSceneVersionId
    ? (await db.select().from(sceneVersions).where(eq(sceneVersions.id, row.activeSceneVersionId)))[0]
    : undefined;
  if (!activeVersion) throw new Error('No active scene version');
  const base = SceneV1.parse(activeVersion.payload);
  const match = base.sceneVersionId.match(/-v(\d+)$/);
  const versionNumber = (match ? Number(match[1]) : 1) + 1;
  const scene: Scene = {
    ...base,
    title: input.patch.title ?? base.title,
    narration: input.patch.narration ?? base.narration,
    durationSeconds: input.patch.durationSeconds ?? base.durationSeconds,
    sceneVersionId: `${base.id}-v${versionNumber}`,
    inputHash: stableHash({
      id: base.id,
      versionNumber,
      title: input.patch.title ?? base.title,
      narration: input.patch.narration ?? base.narration,
      durationSeconds: input.patch.durationSeconds ?? base.durationSeconds,
    }),
  };
  SceneV1.parse(scene);
  const inserted = await db.insert(sceneVersions).values({
    sceneId: row.id,
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    schemaVersion: 1,
    payload: scene,
    inputHash: scene.inputHash,
    provider: 'web-editor',
    costUsd: '0',
  }).returning();
  await db.update(scenes).set({activeSceneVersionId: inserted[0]!.id, status: 'SUCCEEDED'}).where(eq(scenes.id, row.id));
  return scene;
}

export async function listJobs(db: Database, projectId: string) {
  return db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId)).orderBy(generationJobs.createdAt);
}

export async function listRenders(db: Database, projectId: string) {
  return db.select().from(renders).where(eq(renders.projectId, projectId)).orderBy(renders.createdAt);
}
