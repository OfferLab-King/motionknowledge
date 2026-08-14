import {expect, test} from '@playwright/test';
import {eq, sql} from 'drizzle-orm';
import {
  createDatabaseClient,
  workspaces,
  workspaceMemberships,
  type Database,
} from '@motionknowledge/database';
import {
  buildWorkerDeps,
  attachQueue,
  startBoss,
  PgBossJobQueue,
  attachBossHandlers,
  JOB_NAMES,
} from '../../worker/src/harness';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const email = `upload-${Date.now()}@example.test`;

test('creates a source-led project from an uploaded file', async ({page}) => {
  test.setTimeout(600_000);
  process.env.LLM_PROVIDER = 'mock';
  process.env.TTS_PROVIDER = 'mock';
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  const deps = buildWorkerDeps(process.env);
  const boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES], {schema: 'boss_e2e'});
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);
  try {
    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Correct-Horse-42!');
    await page.getByRole('button', {name: 'Create account'}).click();
    await page.waitForURL('**/dashboard', {timeout: 30_000});

    const userRows = await db.execute(sql`select id from auth.users where email = ${email} limit 1`);
    const userId = (userRows[0] as {id?: string})?.id;
    if (!userId) throw new Error('registered user not found');
    const membershipRows = await db.execute(sql`select workspace_id from public.workspace_memberships where user_id = ${userId} limit 1`);
    const workspaceId = String((membershipRows[0] as {workspace_id?: string})?.workspace_id);

    await page.goto('/projects/new');
    await page.getByLabel('Source type').selectOption('file');
    await page.setInputFiles('input[name="sourceFile"]', {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Compound interest grows a balance because returns are reinvested and earn returns of their own. ' +
        'A 5% annual rate doubles a $1,000 balance in roughly 15 years. Educational material, not investment advice.',
      ),
    });
    await page.getByLabel('Topic').fill('Why compound interest accelerates');
    await page.getByLabel('Audience').selectOption('beginner');
    await page.getByLabel('Duration').selectOption('3');
    await page.getByRole('button', {name: 'Create project'}).click();
    await expect(page).toHaveURL(/projects\/[a-f0-9-]+/, {timeout: 30_000});
    const projectId = page.url().split('/').at(-1)!;

    // The uploaded file becomes a PROCESSED source with extracted text stored.
    const deadline = Date.now() + 60_000;
    let source: {kind?: string; status?: string} | undefined;
    while (Date.now() < deadline) {
      const rows = await db.execute(sql`select kind, status from public.sources where project_id = ${projectId} limit 1`);
      const row = rows[0] as {kind?: string; status?: string} | undefined;
      if (row?.status === 'PROCESSED') {
        source = row;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(source?.status).toBe('PROCESSED');
    expect(source?.kind).toBe('text');

    const sourceId = (await db.execute(sql`select id from public.sources where project_id = ${projectId} limit 1`))[0] as {id?: string};
    const key = `${workspaceId}/${projectId}/sources/${sourceId.id}/normalized.txt`;
    const {createStorageProvider, localStorageRoot} = await import('@motionknowledge/storage');
    const storage = createStorageProvider({driver: 'local', localRoot: localStorageRoot});
    const text = new TextDecoder().decode(await storage.get(key));
    expect(text).toContain('Compound interest grows a balance');

    // And the research pipeline extracted claims from it.
    const claimDeadline = Date.now() + 180_000;
    let claimCount = 0;
    while (Date.now() < claimDeadline) {
      const rows = await db.execute(sql`select count(*)::int as count from public.claims where project_id = ${projectId}`);
      claimCount = Number((rows[0] as {count?: number})?.count ?? 0);
      if (claimCount > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    expect(claimCount).toBeGreaterThan(0);
  } finally {
    await boss?.stop();
    // Remove the project's queued pipeline jobs so they never leak into other
    // specs' workers (they share the boss_e2e schema), then delete the project.
    const projectId = page.url().split('/').at(-1)!;
    try {
      await db.execute(sql`delete from boss_e2e.job where data->>'projectId' = ${projectId} and state in ('created', 'retry', 'active')`);
      await db.execute(sql`delete from public.projects where id = ${projectId}`);
    } catch {
      // Cleanup is best-effort.
    }
    await close();
  }
});
