import {and, eq} from 'drizzle-orm';
import {scenes, sceneVersions, generationJobs, renders, type Database} from '@motionknowledge/database';
import {ArtifactRepositoryImpl, type ArtifactType} from '@motionknowledge/database';
import {SceneV1, type Scene, type StyleOverride, type VisualInstruction} from '@motionknowledge/schemas';
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

export async function listSceneVersions(db: Database, projectId: string, sceneId: string): Promise<Array<{versionId: string; payload: Scene; isActive: boolean; createdAt: Date}>> {
  const row = (await db.select().from(scenes).where(and(eq(scenes.projectId, projectId), eq(scenes.sceneKey, sceneId))))[0];
  if (!row) throw new Error('Scene not found');
  const rows = await db.select().from(sceneVersions).where(eq(sceneVersions.sceneId, row.id)).orderBy(sceneVersions.createdAt);
  return rows.map((version) => ({
    versionId: String(version.id),
    payload: SceneV1.parse(version.payload),
    isActive: version.id === row.activeSceneVersionId,
    createdAt: version.createdAt,
  }));
}

export async function getSceneVersionCount(db: Database, sceneId: string): Promise<number> {
  const rows = await db.select({id: sceneVersions.id}).from(sceneVersions).where(eq(sceneVersions.sceneId, sceneId));
  return rows.length;
}

function nextVersionNumber(sceneVersionId: string): number {
  const match = sceneVersionId.match(/-v(\d+)$/);
  return (match ? Number(match[1]) : 1) + 1;
}

function buildCatalogInstruction(visualId: string, title: string, data: unknown): VisualInstruction {
  return {
    type: 'catalog',
    schemaVersion: 1,
    intent: 'show',
    data: {visualId, title, data},
  } as unknown as VisualInstruction;
}

export function buildHyperframesInstruction(htmlAssetKey: string, title: string): VisualInstruction {
  return {
    type: 'hyperframes',
    schemaVersion: 1,
    intent: 'animate',
    data: {title, htmlAssetKey, variables: {}},
  } as unknown as VisualInstruction;
}

export async function applySceneEdit(db: Database, input: {
  projectId: string;
  workspaceId: string;
  sceneKey: string;
  patch: {
    title?: string;
    narration?: string;
    durationSeconds?: number;
    styleOverride?: Partial<StyleOverride>;
    visual?: {visualId: string; data?: unknown; htmlAssetKey?: string};
  };
}): Promise<Scene> {
  const row = (await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, input.sceneKey))))[0];
  if (!row) throw new Error('Scene not found');
  const activeVersion = row.activeSceneVersionId
    ? (await db.select().from(sceneVersions).where(eq(sceneVersions.id, row.activeSceneVersionId)))[0]
    : undefined;
  if (!activeVersion) throw new Error('No active scene version');
  const base = SceneV1.parse(activeVersion.payload);
  const versionNumber = nextVersionNumber(base.sceneVersionId);
  const styleOverride = input.patch.styleOverride
    ? {...base.styleOverride, ...input.patch.styleOverride}
    : base.styleOverride;
  let visual: VisualInstruction = base.visual;
  if (input.patch.visual) {
    if (input.patch.visual.visualId === '__hyperframes__') {
      if (!input.patch.visual.htmlAssetKey) throw new Error('hyperframes visual requires an htmlAssetKey');
      visual = buildHyperframesInstruction(input.patch.visual.htmlAssetKey, input.patch.title ?? base.title);
    } else {
      visual = buildCatalogInstruction(input.patch.visual.visualId, input.patch.title ?? base.title, input.patch.visual.data ?? {});
    }
  }
  const scene: Scene = {
    ...base,
    title: input.patch.title ?? base.title,
    narration: input.patch.narration ?? base.narration,
    durationSeconds: input.patch.durationSeconds ?? base.durationSeconds,
    visual,
    styleOverride,
    sceneVersionId: `${base.id}-v${versionNumber}`,
    inputHash: stableHash({
      id: base.id,
      versionNumber,
      title: input.patch.title ?? base.title,
      narration: input.patch.narration ?? base.narration,
      durationSeconds: input.patch.durationSeconds ?? base.durationSeconds,
      visual,
      styleOverride,
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
  await db.update(scenes).set({activeSceneVersionId: inserted[0]!.id, status: 'SUCCEEDED', title: scene.title}).where(eq(scenes.id, row.id));
  return scene;
}

async function reindexScenes(db: Database, projectId: string): Promise<void> {
  const rows = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.index, scenes.createdAt);
  for (const [position, row] of rows.entries()) {
    if (row.index !== position) {
      await db.update(scenes).set({index: position}).where(eq(scenes.id, row.id));
    }
  }
}

/** Duplicate a scene (payload, visual, overrides) as a new scene after it. */
export async function duplicateScene(db: Database, input: {
  projectId: string;
  workspaceId: string;
  sceneKey: string;
}): Promise<Scene> {
  const row = (await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, input.sceneKey))))[0];
  if (!row) throw new Error('Scene not found');
  const activeVersion = row.activeSceneVersionId
    ? (await db.select().from(sceneVersions).where(eq(sceneVersions.id, row.activeSceneVersionId)))[0]
    : undefined;
  if (!activeVersion) throw new Error('No active scene version');
  const base = SceneV1.parse(activeVersion.payload);
  let newKey = `${input.sceneKey}-copy`;
  let suffix = 2;
  while ((await db.select().from(scenes).where(and(eq(scenes.projectId, input.projectId), eq(scenes.sceneKey, newKey))))[0]) {
    newKey = `${input.sceneKey}-copy-${suffix++}`;
  }
  const newScene: Scene = {
    ...base,
    id: newKey,
    sceneVersionId: `${newKey}-v1`,
    index: row.index + 1,
    inputHash: stableHash({id: newKey, source: base.sceneVersionId, version: 1}),
  };
  SceneV1.parse(newScene);
  const insertedRow = await db.insert(scenes).values({
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    sceneKey: newKey,
    index: row.index + 1,
    title: newScene.title,
    status: 'SUCCEEDED',
  }).returning();
  const versionRow = await db.insert(sceneVersions).values({
    sceneId: insertedRow[0]!.id,
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    schemaVersion: 1,
    payload: newScene,
    inputHash: newScene.inputHash,
    provider: 'web-editor',
    costUsd: '0',
  }).returning();
  await db.update(scenes).set({activeSceneVersionId: versionRow[0]!.id}).where(eq(scenes.id, insertedRow[0]!.id));
  await reindexScenes(db, input.projectId);
  return newScene;
}

/** Delete a scene and its version history, then compact indexes. */
export async function deleteScene(db: Database, input: {
  projectId: string;
  workspaceId: string;
  sceneKey: string;
}): Promise<void> {
  const deleted = await db
    .delete(scenes)
    .where(and(eq(scenes.projectId, input.projectId), eq(scenes.workspaceId, input.workspaceId), eq(scenes.sceneKey, input.sceneKey)))
    .returning({id: scenes.id});
  if (deleted.length === 0) throw new Error('Scene not found');
  await reindexScenes(db, input.projectId);
}

/** Reorder scenes by scene key. Payload `index` fields are refreshed via new versions. */
export async function reorderScenes(db: Database, input: {
  projectId: string;
  workspaceId: string;
  orderedSceneKeys: string[];
}): Promise<void> {
  const rows = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId));
  const existingKeys = rows.map((row) => row.sceneKey).sort();
  const orderedKeys = [...input.orderedSceneKeys].sort();
  if (existingKeys.length !== orderedKeys.length || existingKeys.some((key, i) => key !== orderedKeys[i])) {
    throw new Error('Reorder must contain exactly the project scenes');
  }
  const versions = await db.select().from(sceneVersions).where(eq(sceneVersions.projectId, input.projectId));
  for (const [position, sceneKey] of input.orderedSceneKeys.entries()) {
    const row = rows.find((r) => r.sceneKey === sceneKey);
    if (!row) throw new Error(`Unknown scene ${sceneKey}`);
    await db.update(scenes).set({index: position}).where(eq(scenes.id, row.id));
    const active = row.activeSceneVersionId
      ? versions.find((v) => String(v.id) === String(row.activeSceneVersionId))
      : undefined;
    if (!active) continue;
    const base = SceneV1.parse(active.payload);
    if (base.index === position) continue;
    const versionNumber = nextVersionNumber(base.sceneVersionId);
    const scene: Scene = {
      ...base,
      index: position,
      sceneVersionId: `${base.id}-v${versionNumber}`,
      inputHash: stableHash({...base, index: position, versionNumber}),
    };
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
    await db.update(scenes).set({activeSceneVersionId: inserted[0]!.id}).where(eq(scenes.id, row.id));
  }
}

export async function listJobs(db: Database, projectId: string) {
  return db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId)).orderBy(generationJobs.createdAt);
}

export async function listRenders(db: Database, projectId: string) {
  return db.select().from(renders).where(eq(renders.projectId, projectId)).orderBy(renders.createdAt);
}
