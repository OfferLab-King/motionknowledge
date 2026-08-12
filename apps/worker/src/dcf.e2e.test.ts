import {beforeAll, describe, expect, it} from 'vitest';
import {and, eq} from 'drizzle-orm';
import {
  createDatabaseClient,
  workspaces,
  projects,
  sources,
  scenes,
  sceneVersions,
  renders,
  generationJobs,
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

async function createDcfProject(workspaceId: string) {
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
  await db.insert(sources).values({
    projectId: projectRow.id,
    workspaceId,
    kind: 'text',
    title: 'Discounted Cash Flow — Educator Reference',
    rawSha256: sha256Hex(rawBytes),
    normalizedSha256: hashText(DCF_SOURCE_TEXT),
    originalUrl: null,
    fetchedAt: null,
    language: 'en',
    byteCount: rawBytes.length,
    status: 'PROCESSED',
  });
  return {projectId: projectRow.id, workspaceId};
}

async function runProjectToPreview(projectId: string): Promise<void> {
  const project = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
  if (!project) throw new Error('Project not found');
  await deps.queue.enqueue({
    jobId: `${projectId}-research`,
    workspaceId: project.workspaceId,
    projectId,
    operation: 'RESEARCH_PROJECT',
    inputHash: '0'.repeat(64),
    idempotencyKey: `e2e|${projectId}|research`,
    payload: {workspaceId: project.workspaceId, projectId},
  });
  await waitForProjectStatus(projectId, 'READY_FOR_REVIEW', 240_000);
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
  await drainJobs(projectId, 240_000);
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
  await waitForProjectStatus(projectId, 'COMPLETE', 300_000);
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
  process.env.PREVIEW_WIDTH = '480';
  process.env.PREVIEW_HEIGHT = '270';
  process.env.RENDER_WIDTH = '640';
  process.env.RENDER_HEIGHT = '360';
  ({db} = createDatabaseClient({url: DATABASE_URL}));
  const workspace = await db.insert(workspaces).values({name: 'DCF E2E Workspace'}).returning();
  fixtureWorkspaceId = workspace[0]!.id;
  deps = buildWorkerDeps(process.env);
  const boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES]);
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);
  return async () => {
    await boss.stop();
  };
}, 60_000);

describe('DCF end-to-end acceptance', () => {
  it('generates, edits one scene, rerenders, and exports MP4 plus SRT', async () => {
    const {projectId} = await createDcfProject(fixtureWorkspaceId);
    await runProjectToPreview(projectId);

    const calcSceneRow = (await db
      .select()
      .from(scenes)
      .where(and(eq(scenes.projectId, projectId), eq(scenes.sceneKey, 'scene-calculation'))))[0];
    if (!calcSceneRow) throw new Error('scene-calculation missing');
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
  }, 600_000);
});
