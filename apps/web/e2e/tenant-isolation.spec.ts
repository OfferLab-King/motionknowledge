import {expect, test} from '@playwright/test';
import {eq, sql} from 'drizzle-orm';
import {
  createDatabaseClient,
  workspaces,
  workspaceMemberships,
  projects,
  renders,
  type Database,
} from '@motionknowledge/database';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const outsiderEmail = `outsider-${Date.now()}@example.test`;

test('cannot download another workspace render', async ({page}) => {
  test.setTimeout(180_000);
  const {db} = createDatabaseClient({url: DATABASE_URL});
  const {createClient} = await import('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {auth: {persistSession: false}});

  const {data: owner, error: ownerError} = await admin.auth.admin.createUser({
    email: `owner-${Date.now()}@example.test`,
    password: 'Correct-Horse-42!',
    email_confirm: true,
  });
  if (ownerError || !owner.user) throw new Error('owner creation failed');

  const ownerWorkspace = await db.insert(workspaces).values({name: 'Owner workspace'}).returning();
  await db.insert(workspaceMemberships).values({workspaceId: ownerWorkspace[0]!.id, userId: owner.user.id, role: 'owner'});

  const ownerProject = await db
    .insert(projects)
    .values({workspaceId: ownerWorkspace[0]!.id, title: 'Owner secret render', audienceLevel: 'beginner', targetDurationSeconds: 300})
    .returning();
  const projectId = ownerProject[0]!.id;

  const ownerRender = await db
    .insert(renders)
    .values({
      workspaceId: ownerWorkspace[0]!.id,
      projectId,
      kind: 'FINAL',
      status: 'succeeded',
      mp4Key: `${ownerWorkspace[0]!.id}/${projectId}/renders/final/aa/video.mp4`,
      srtKey: `${ownerWorkspace[0]!.id}/${projectId}/renders/final/aa/video.srt`,
    })
    .returning();
  const renderId = ownerRender[0]!.id;

  await page.goto('/register');
  await page.getByLabel('Email').fill(outsiderEmail);
  await page.getByLabel('Password').fill('Correct-Horse-42!');
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.waitForURL('**/dashboard', {timeout: 30_000});

  const response = await page.request.get(`/api/projects/${projectId}/downloads/${renderId}?file=mp4`);
  expect(response.status()).toBe(404);
});
