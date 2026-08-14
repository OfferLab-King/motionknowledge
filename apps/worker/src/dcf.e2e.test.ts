import {beforeAll, describe, expect, it} from 'vitest';
import {and, eq} from 'drizzle-orm';
import {
  createDatabaseClient,
  workspaces,
  projects,
  sources,
  scenes,
  sceneVersions,
  audioAssets,
  renders,
  generationJobs,
  claimSourceLinks,
  claims,
  type Database,
} from '@motionknowledge/database';
import {sha256Hex, hashText} from '@motionknowledge/assets';
import {buildWorkerDeps, attachQueue, type WorkerDeps} from './deps';
import {startBoss, PgBossJobQueue, JOB_NAMES} from '@motionknowledge/jobs';
import {attachBossHandlers} from './register';
import {probeVideo} from '@motionknowledge/remotion-engine';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DCF_TOPIC, DCF_SOURCE_TEXT} from '@motionknowledge/testkit';
import {localExportRoot} from './lib/paths';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const EXPORT_DIR = join(localExportRoot, 'dcf');

let db: Database;
let deps: WorkerDeps;
let fixtureWorkspaceId: string;

async function waitForProjectStatus(projectId: string, status: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
    if (row?.status === status) return;
    if (row?.status === 'QA_FAILED') throw new Error(`Project failed QA: ${row.status}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${status}`);
}

async function drainJobs(projectId: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jobs = await db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId));
    const pending = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
    const failed = jobs.filter((job) => job.status === 'failed');
    if (failed.length > 0) throw new Error(`Job failed: ${failed[0]?.safeError ?? 'unknown'}`);
    if (pending.length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Timed out draining jobs');
}

/**
 * Creates a DCF project with a real supplied text source (stored normalized
 * text) so research must extract claims from supplied material.
 */
async function createDcfProjectWithSuppliedSource(workspaceId: string) {
  const project = await db
    .insert(projects)
    .values({
      workspaceId,
      title: DCF_TOPIC,
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
      language: 'en',
      tone: 'professional',
      style: 'professional',
      aspectRatio: '16:9',
    })
    .returning();
  const projectRow = project[0]!;
  const rawBytes = new TextEncoder().encode(DCF_SOURCE_TEXT);
  const source = await db
    .insert(sources)
    .values({
      projectId: projectRow.id,
      workspaceId,
      kind: 'text',
      title: 'Discounted Cash Flow — Educator Reference',
      rawSha256: sha256Hex(rawBytes),
      normalizedSha256: hashText(DCF_SOURCE_TEXT),
      originalUrl: null,
      fetchedAt: new Date(),
      language: 'en',
      byteCount: rawBytes.length,
      status: 'PROCESSED',
    })
    .returning();
  const sourceRow = source[0]!;
  const {sourceTextKey} = await import('@motionknowledge/research');
  await deps.storage.put({
    key: sourceTextKey(workspaceId, projectRow.id, String(sourceRow.id)),
    body: rawBytes,
    contentType: 'text/plain',
    sha256: sha256Hex(rawBytes),
  });
  return {projectId: projectRow.id, sourceRow};
}

async function regenerateScene(projectId: string, sceneKey: string, patch: {title?: string}): Promise<void> {
  const project = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
  if (!project) throw new Error('Project not found');
  await deps.queue.enqueue({
    jobId: `${projectId}-scene-${sceneKey}`,
    workspaceId: project.workspaceId,
    projectId,
    operation: 'GENERATE_SCENE',
    inputHash: hashText(JSON.stringify(patch)),
    idempotencyKey: `e2e|${projectId}|scene|${sceneKey}|${hashText(JSON.stringify(patch))}`,
    payload: {workspaceId: project.workspaceId, projectId, sceneId: sceneKey, patch},
  });
  await drainJobs(projectId, 480_000);
  const current = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
  if (current?.status !== 'READY_FOR_REVIEW' && current?.status !== 'PREVIEW_READY') {
    throw new Error(`Project not reviewable after regeneration: ${current?.status}`);
  }
}

async function renderApprovedProject(projectId: string) {
  const project = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
  if (!project) throw new Error('Project not found');
  await db.update(projects).set({status: 'APPROVED'}).where(eq(projects.id, projectId));
  await deps.queue.enqueue({
    jobId: `${projectId}-render-final`,
    workspaceId: project.workspaceId,
    projectId,
    operation: 'RENDER_FINAL',
    inputHash: '1'.repeat(64),
    idempotencyKey: `e2e|${projectId}|render-final`,
    payload: {workspaceId: project.workspaceId, projectId},
  });
  await waitForProjectStatus(projectId, 'COMPLETE', 420_000);
  const finalRows = await db.select().from(renders).where(eq(renders.projectId, projectId));
  const final = finalRows.filter((row) => row.kind === 'FINAL').at(-1);
  if (!final?.mp4Key || !final?.srtKey) throw new Error('Final render missing outputs');
  await mkdir(EXPORT_DIR, {recursive: true});
  const mp4Path = join(EXPORT_DIR, 'video.mp4');
  const srtPath = join(EXPORT_DIR, 'video.srt');
  await writeFile(mp4Path, Buffer.from(await deps.storage.get(final.mp4Key)));
  await writeFile(srtPath, Buffer.from(await deps.storage.get(final.srtKey)));
  return {mp4Path, srtPath};
}

beforeAll(async () => {
  process.env.LLM_PROVIDER = 'mock';
  process.env.TTS_PROVIDER = 'mock';
  process.env.PREVIEW_WIDTH = '480';
  process.env.PREVIEW_HEIGHT = '270';
  process.env.RENDER_WIDTH = '640';
  process.env.RENDER_HEIGHT = '360';
  ({db} = createDatabaseClient({url: DATABASE_URL}));
  const workspace = await db.insert(workspaces).values({name: 'DCF E2E Workspace'}).returning();
  fixtureWorkspaceId = workspace[0]!.id;
  deps = buildWorkerDeps(process.env);
  const boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES], {schema: "boss_e2e"});
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);
  return async () => {
    await boss.stop();
  };
}, 60_000);

describe('DCF end-to-end acceptance', () => {
  it('extracts claims from a supplied source, then edits, rerenders and exports MP4 plus SRT', async () => {
    const {projectId, sourceRow} = await createDcfProjectWithSuppliedSource(fixtureWorkspaceId);

    // Research must extract claims from the supplied source text and link
    // them to the source row.
    await deps.queue.enqueue({
      jobId: `${projectId}-research-supplied`,
      workspaceId: fixtureWorkspaceId,
      projectId,
      operation: 'RESEARCH_PROJECT',
      inputHash: '9'.repeat(64),
      idempotencyKey: `e2e|${projectId}|research-supplied`,
      payload: {workspaceId: fixtureWorkspaceId, projectId},
    });
    await waitForProjectStatus(projectId, 'OUTLINE_READY', 480_000);
    const linkRows = await db
      .select({claimId: claimSourceLinks.claimId, sourceId: claimSourceLinks.sourceId})
      .from(claimSourceLinks)
      .where(eq(claimSourceLinks.sourceId, sourceRow.id));
    expect(linkRows.length).toBeGreaterThan(0);
    const claimRows = await db.select().from(claims).where(eq(claims.projectId, projectId));
    expect(claimRows.length).toBeGreaterThan(0);

    // The pipeline continues automatically to a reviewable preview.
    await waitForProjectStatus(projectId, 'READY_FOR_REVIEW', 900_000);

    const calcSceneRow = (await db
      .select()
      .from(scenes)
      .where(and(eq(scenes.projectId, projectId), eq(scenes.sceneKey, 'scene-calculation'))))[0];
    if (!calcSceneRow) throw new Error('scene-calculation missing');

    // Forced narration regeneration synthesizes a new audio asset for the
    // active version even though audio already exists.
    const activeVersionId = calcSceneRow.activeSceneVersionId;
    if (!activeVersionId) throw new Error('scene-calculation has no active version');
    const activeVersion = (await db.select().from(sceneVersions).where(eq(sceneVersions.id, activeVersionId)))[0];
    if (!activeVersion) throw new Error('active version missing');
    const ttsBefore = await db.select().from(audioAssets).where(eq(audioAssets.sceneId, calcSceneRow.id));
    await deps.queue.enqueue({
      jobId: `${projectId}-tts-force`,
      workspaceId: fixtureWorkspaceId,
      projectId,
      operation: 'SYNTHESIZE_TTS',
      inputHash: 'f'.repeat(64),
      idempotencyKey: `e2e|${projectId}|tts-force|${activeVersion.id}`,
      payload: {
        workspaceId: fixtureWorkspaceId,
        projectId,
        sceneId: 'scene-calculation',
        sceneVersionId: (activeVersion.payload as {sceneVersionId?: string}).sceneVersionId,
        force: true,
      },
    });
    await drainJobs(projectId, 480_000);
    const ttsAfter = await db.select().from(audioAssets).where(eq(audioAssets.sceneId, calcSceneRow.id));
    expect(ttsAfter.length).toBe(ttsBefore.length + 1);

    const before = await db
      .select()
      .from(sceneVersions)
      .where(eq(sceneVersions.sceneId, calcSceneRow.id));
    await regenerateScene(projectId, 'scene-calculation', {title: 'Present value, step by step'});
    const after = await db
      .select()
      .from(sceneVersions)
      .where(eq(sceneVersions.sceneId, calcSceneRow.id));
    expect(after.length).toBe(before.length + 1);

    const activeCalc = await db
      .select()
      .from(sceneVersions)
      .where(eq(sceneVersions.id, (await db.select().from(scenes).where(eq(scenes.id, calcSceneRow.id)))[0]?.activeSceneVersionId ?? ''));
    expect((activeCalc[0]?.payload as {title?: string})?.title ?? '').toBe('Present value, step by step');

    const render = await renderApprovedProject(projectId);
    expect(await probeVideo(render.mp4Path)).toMatchObject({videoCodec: 'h264'});
    const srt = await readFile(render.srtPath, 'utf8');
    expect(srt).toContain('discount rate');
    expect(srt).toContain('-->');
  }, 1_500_000);
});
