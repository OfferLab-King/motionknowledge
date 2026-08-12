/**
 * Copies the latest QA-passed preview render to var/exports/dcf/preview.mp4
 * and prints its path and ffprobe result. Usage: pnpm dcf:preview
 */
import {createDatabaseClient, projects, renders} from '@motionknowledge/database';
import {buildWorkerDeps} from '../apps/worker/src/deps';
import {probeVideo} from '@motionknowledge/remotion-engine';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {eq} from 'drizzle-orm';
import {localExportRoot} from '../apps/worker/src/lib/paths';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const EXPORT_DIR = join(localExportRoot, 'dcf');

async function main(): Promise<void> {
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  const deps = buildWorkerDeps(process.env);
  try {
    const project = (await db.select().from(projects).where(eq(projects.title, 'What is a Discounted Cash Flow?')).limit(1))[0];
    if (!project) throw new Error('No DCF project found; run pnpm dcf:generate first');
    const preview = (await db.select().from(renders).where(eq(renders.projectId, project.id))).filter((row) => row.kind === 'PREVIEW').at(-1);
    if (!preview?.mp4Key) throw new Error('No preview render found');
    await mkdir(EXPORT_DIR, {recursive: true});
    const outPath = join(EXPORT_DIR, 'preview.mp4');
    await writeFile(outPath, Buffer.from(await deps.storage.get(preview.mp4Key)));
    const probe = await probeVideo(outPath);
    console.log(JSON.stringify({previewPath: outPath, ...probe}, null, 2));
  } finally {
    await close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('dcf:preview failed', error);
  process.exit(1);
});
