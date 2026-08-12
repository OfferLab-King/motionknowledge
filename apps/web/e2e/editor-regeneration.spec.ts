import {expect, test} from '@playwright/test';
import {eq} from 'drizzle-orm';
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

let db: Database;
let seededProjectId = '';
let seededEmail = '';
let deps: ReturnType<typeof buildWorkerDeps>;
let boss: Awaited<ReturnType<typeof startBoss>>;

test.beforeAll(async () => {
  test.setTimeout(300_000);
  process.env.PREVIEW_WIDTH = '320';
  process.env.PREVIEW_HEIGHT = '180';
  process.env.RENDER_WIDTH = '640';
  process.env.RENDER_HEIGHT = '360';
  ({db} = createDatabaseClient({url: DATABASE_URL}));
  const {createClient} = await import('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {auth: {persistSession: false}});
  seededEmail = `editor-${Date.now()}@example.test`;
  const {data, error} = await admin.auth.admin.createUser({
    email: seededEmail,
    password: 'Correct-Horse-42!',
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;

  const workspace = await db.insert(workspaces).values({name: 'Editor E2E Workspace'}).returning();
  const workspaceId = workspace[0]!.id;
  await db.insert(workspaceMemberships).values({workspaceId, userId, role: 'owner'});

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

  deps = buildWorkerDeps(process.env);
  boss = await startBoss(deps.config.databaseUrl, [...JOB_NAMES]);
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);

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
});

test.afterAll(async () => {
  await boss?.stop();
});

test('edits and regenerates only one scene', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(seededEmail);
  await page.getByLabel('Password').fill('Correct-Horse-42!');
  await page.getByRole('button', {name: 'Sign in'}).click();
  await page.goto(`/projects/${seededProjectId}/editor`);

  const untouchedVersion = await page.getByTestId('scene-definition-version').textContent();
  await page.getByRole('button', {name: 'Step-by-step calculation'}).click();
  await page.getByLabel('Scene title').fill('Present value, step by step');
  await page.getByRole('button', {name: 'Regenerate scene'}).click();
  await expect(page.getByText('Scene ready').last()).toBeVisible({timeout: 120_000});
  await expect(page.getByTestId('scene-definition-version')).toHaveText(untouchedVersion!);
  await expect(page.getByLabel('Scene title')).toHaveValue('Present value, step by step');
});
