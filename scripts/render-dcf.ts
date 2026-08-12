/**
 * Renders the approved DCF reference project to var/exports/dcf/.
 * Prints project ID, output paths, duration, provider cost, and ffprobe result.
 * Usage: pnpm dcf:render
 */
import {createDatabaseClient, projects, renders} from '@motionknowledge/database';
import {buildWorkerDeps, attachQueue} from '../apps/worker/src/deps';
import {startBoss, PgBossJobQueue, JOB_NAMES} from '@motionknowledge/jobs';
import {attachBossHandlers} from '../apps/worker/src/register';
import {probeVideo} from '@motionknowledge/remotion-engine';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {eq, and, inArray} from 'drizzle-orm';
import {localExportRoot} from '../apps/worker/src/lib/paths';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const EXPORT_DIR = join(localExportRoot, 'dcf');

async function findDcfProjectId(): Promise<string> {
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.title, 'What is a Discounted Cash Flow?'), inArray(projects.status, ['READY_FOR_REVIEW', 'APPROVED', 'COMPLETE'])))
      .orderBy(projects.createdAt);
    const row = rows.at(-1);
    if (!row) throw new Error('No reviewable DCF project found; run pnpm dcf:generate first');
    return row.id;
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  const projectId = await findDcfProjectId();
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  try {
    const project = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
    if (!project) throw new Error('Project not found');
    if (project.status !== 'READY_FOR_REVIEW' && project.status !== 'APPROVED' && project.status !== 'COMPLETE') {
      console.error(`Project status is ${project.status}; expected READY_FOR_REVIEW/APPROVED/COMPLETE`);
      process.exit(1);
    }

    const deps = buildWorkerDeps(process.env);
    const boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES]);
    attachQueue(deps, new PgBossJobQueue(boss, deps.db));
    await attachBossHandlers(boss, deps);

    const existing = (await db.select().from(renders).where(eq(renders.projectId, projectId))).filter((row) => row.kind === 'FINAL').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (existing?.status === 'succeeded' && project.status === 'COMPLETE') {
      console.log('DCF project already rendered; re-rendering for a fresh copy.');
    }
    await db.update(projects).set({status: 'APPROVED'}).where(eq(projects.id, projectId));

    await deps.queue.enqueue({
      jobId: `${projectId}-render-final`,
      workspaceId: project.workspaceId,
      projectId,
      operation: 'RENDER_FINAL',
      inputHash: '1'.repeat(64),
      idempotencyKey: `dcf|${projectId}|render-final|${Date.now()}`,
      payload: {workspaceId: project.workspaceId, projectId},
    });

    const deadline = Date.now() + 600_000;
    let finalRender: (typeof renders.$inferSelect) | null = null;
    while (Date.now() < deadline) {
      const row = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
      if (row?.status === 'COMPLETE') {
        const finalRows = await db.select().from(renders).where(eq(renders.projectId, projectId));
        finalRender = finalRows.filter((r) => r.kind === 'FINAL').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await boss.stop();
    if (!finalRender || finalRender.status !== 'succeeded' || !finalRender.mp4Key || !finalRender.srtKey) {
      console.error('Final render did not complete successfully');
      process.exit(1);
    }

    await mkdir(EXPORT_DIR, {recursive: true});
    const videoPath = join(EXPORT_DIR, 'video.mp4');
    const srtPath = join(EXPORT_DIR, 'video.srt');
    await writeFile(videoPath, Buffer.from(await deps.storage.get(finalRender.mp4Key)));
    await writeFile(srtPath, Buffer.from(await deps.storage.get(finalRender.srtKey)));
    if (finalRender.thumbnailKey) {
      await writeFile(join(EXPORT_DIR, 'thumbnail.png'), Buffer.from(await deps.storage.get(finalRender.thumbnailKey)));
    }
    if (finalRender.metadataKey) {
      await writeFile(join(EXPORT_DIR, 'render-metadata.json'), Buffer.from(await deps.storage.get(finalRender.metadataKey)));
    }

    const probe = await probeVideo(videoPath);
    const cost = await deps.usage.projectCost(projectId, project.workspaceId);
    console.log(JSON.stringify({
      projectId,
      output: {video: videoPath, srt: srtPath, thumbnail: join(EXPORT_DIR, 'thumbnail.png')},
      durationSeconds: probe.durationSeconds,
      width: probe.width,
      height: probe.height,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      fps: probe.fps,
      providerCostUsd: cost,
    }, null, 2));
    await close();
    process.exit(0);
  } finally {
    await close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('dcf:render failed', error);
  process.exit(1);
});
