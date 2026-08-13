import {expect, test} from '@playwright/test';
import {eq, sql} from 'drizzle-orm';
import {
  createDatabaseClient,
  workspaces,
  workspaceMemberships,
  projects,
  sources,
  type Database,
} from '@motionknowledge/database';
import {sha256Hex, hashText} from '@motionknowledge/assets';
import {
  buildWorkerDeps,
  attachQueue,
  startBoss,
  PgBossJobQueue,
  attachBossHandlers,
  JOB_NAMES,
} from '../../worker/src/harness';
import {DCF_TOPIC, DCF_SOURCE_TEXT} from '@motionknowledge/testkit';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';

const seededEmail = `editor-${Date.now()}@example.test`;
let db: Database;
let seededProjectId = '';
let deps: ReturnType<typeof buildWorkerDeps>;
let boss: Awaited<ReturnType<typeof startBoss>>;

test.beforeAll(async () => {
  test.setTimeout(300_000);
  process.env.LLM_PROVIDER = 'mock';
  process.env.TTS_PROVIDER = 'mock';
  process.env.PREVIEW_WIDTH = '320';
  process.env.PREVIEW_HEIGHT = '180';
  process.env.RENDER_WIDTH = '640';
  process.env.RENDER_HEIGHT = '360';
  ({db} = createDatabaseClient({url: DATABASE_URL}));
  deps = buildWorkerDeps(process.env);
  boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES]);
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);
});

test.afterAll(async () => {
  await boss?.stop();
});

test('edits and regenerates only one scene', async ({page}) => {
  test.setTimeout(420_000);
  await page.goto('/register');
  await page.getByLabel('Email').fill(seededEmail);
  await page.getByLabel('Password').fill('Correct-Horse-42!');
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.waitForURL('**/dashboard', {timeout: 30_000});

  const userRows = await db.execute(sql`select id from auth.users where email = ${seededEmail} limit 1`);
  const userId = (userRows[0] as {id?: string})?.id;
  if (!userId) throw new Error('registered user not found');
  const membershipRows = await db.execute(sql`select workspace_id from public.workspace_memberships where user_id = ${userId} limit 1`);
  const workspaceId = String((membershipRows[0] as {workspace_id?: string})?.workspace_id);
  if (!workspaceId) throw new Error('user has no workspace');

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
  seededProjectId = project[0]!.id;
  const rawBytes = new TextEncoder().encode(DCF_SOURCE_TEXT);
  await db.insert(sources).values({
    projectId: seededProjectId,
    workspaceId,
    kind: 'text',
    title: 'Discounted Cash Flow — Educator Reference',
    rawSha256: sha256Hex(rawBytes),
    normalizedSha256: hashText(DCF_SOURCE_TEXT),
    language: 'en',
    byteCount: rawBytes.length,
    status: 'PROCESSED',
  });

  await deps.queue.enqueue({
    jobId: `${seededProjectId}-research`,
    workspaceId,
    projectId: seededProjectId,
    operation: 'RESEARCH_PROJECT',
    inputHash: '0'.repeat(64),
    idempotencyKey: `web-e2e|${seededProjectId}|research`,
    payload: {workspaceId, projectId: seededProjectId},
  });

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const row = await db.query.projects.findFirst({where: eq(projects.id, seededProjectId)});
    if (row?.status === 'READY_FOR_REVIEW') break;
    if (row?.status === 'QA_FAILED') throw new Error('Seeded project failed QA');
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const final = await db.query.projects.findFirst({where: eq(projects.id, seededProjectId)});
  if (final?.status !== 'READY_FOR_REVIEW') throw new Error('Seeded project did not reach READY_FOR_REVIEW');

  await page.goto(`/projects/${seededProjectId}/editor`);
  await expect(page.getByTestId('scene-definition-version')).toBeVisible({timeout: 30_000});
  const untouchedVersion = await page.getByTestId('scene-definition-version').textContent();
  await page.getByRole('button', {name: 'Step-by-step calculation'}).click();
  await page.getByLabel('Scene title').fill('Present value, step by step');
  await page.getByRole('button', {name: 'Regenerate scene'}).click();
  await expect(page.getByText('Scene ready').last()).toBeVisible({timeout: 120_000});
  await expect(page.getByTestId('scene-definition-version')).toHaveText(untouchedVersion!);
  await expect(page.getByLabel('Scene title')).toHaveValue('Present value, step by step');
});
