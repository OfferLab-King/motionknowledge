import {expect, test} from '@playwright/test';
import {eq} from 'drizzle-orm';
import {createDatabaseClient, projects, type Database} from '@motionknowledge/database';
import {
  buildWorkerDeps,
  attachQueue,
  startBoss,
  PgBossJobQueue,
  attachBossHandlers,
  JOB_NAMES,
} from '../../worker/src/harness';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const email = `journey-${Date.now()}@example.test`;
const password = 'Correct-Horse-42!';

let db: Database;
let deps: ReturnType<typeof buildWorkerDeps>;
let boss: Awaited<ReturnType<typeof startBoss>>;

test.beforeAll(async () => {
  test.setTimeout(600_000);
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

test('completes the DCF product journey', async ({page}) => {
  test.setTimeout(900_000);
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.getByRole('navigation').getByRole('link', {name: 'New video'}).click();
  await page.getByLabel('Topic').fill('What is a Discounted Cash Flow?');
  await page.getByLabel('Audience').selectOption('beginner');
  await page.getByLabel('Duration').selectOption('5');
  await page.getByRole('button', {name: 'Create project'}).click();
  await expect(page).toHaveURL(/projects\/[a-f0-9-]+/);
  const projectId = page.url().split('/projects/')[1]!;

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const row = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
    if (row?.status === 'READY_FOR_REVIEW') break;
    if (row?.status === 'QA_FAILED') throw new Error('Project failed QA');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await page.goto(`/projects/${projectId}/editor`);
  await page.getByRole('button', {name: 'Step-by-step calculation'}).click();
  await page.getByLabel('Scene title').fill('Present value, step by step');
  await page.getByRole('button', {name: 'Regenerate scene'}).click();
  await expect(page.getByText('Scene ready').last()).toBeVisible({timeout: 120_000});

  await page.goto(`/projects/${projectId}/exports`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.getByRole('button', {name: 'Final render'}).click();

  const renderDeadline = Date.now() + 420_000;
  let complete = false;
  while (Date.now() < renderDeadline) {
    const row = await db.query.projects.findFirst({where: eq(projects.id, projectId)});
    if (row?.status === 'COMPLETE') {
      complete = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  expect(complete).toBe(true);

  await page.reload();
  await expect(page.getByText('Render complete')).toBeVisible({timeout: 30_000});
  await expect(page.getByRole('link', {name: 'Download MP4'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Download SRT'})).toBeVisible();
});
