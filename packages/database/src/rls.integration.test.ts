import {beforeAll, describe, expect, it} from 'vitest';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {eq, sql} from 'drizzle-orm';
import {createDatabaseClient, type Database} from './client';
import {projects, lessonPlanVersions, workspaces, workspaceMemberships} from './schema/index';
import {ProjectRepositoryImpl} from './repositories/projects';
import {ArtifactRepositoryImpl} from './repositories/artifacts';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';

interface TenantFixture {
  supabase: SupabaseClient;
  serviceDb: Database;
  serviceClose: () => Promise<void>;
  clients: Map<string, {db: Database; close: () => Promise<void>}>;
}

const fixture: TenantFixture = {
  supabase: createClient(URL, SERVICE_ROLE_KEY, {auth: {persistSession: false}}),
  serviceDb: createDatabaseClient({url: DATABASE_URL}).db,
  serviceClose: () => Promise.resolve(),
  clients: new Map(),
};

let sequence = 0;

async function createUserWithWorkspace() {
  const email = `tenant-${Date.now()}-${sequence++}@test.local`;
  const {data, error} = await fixture.supabase.auth.admin.createUser({
    email,
    password: 'Correct-Horse-42!',
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;
  const workspace = await fixture.serviceDb
    .insert(workspaces)
    .values({name: `Workspace ${sequence}`})
    .returning();
  const ws = workspace[0]!;
  await fixture.serviceDb
    .insert(workspaceMemberships)
    .values({workspaceId: ws.id, userId, role: 'owner'})
    .returning();
  return {userId, workspaceId: ws.id};
}

async function asUser(userId: string) {
  const existing = fixture.clients.get(userId);
  if (existing) return existing;
  const {db, close} = createDatabaseClient({
    url: DATABASE_URL,
    max: 1,
    onnotice: () => undefined,
  });
  const claims = JSON.stringify({sub: userId, role: 'authenticated'}).replaceAll("'", "''");
  await db.execute(sql.raw(`set role authenticated; set request.jwt.claims = '${claims}';`));
  fixture.clients.set(userId, {db, close});
  return {db, close};
}

beforeAll(async () => {
  const {db, close} = createDatabaseClient({url: DATABASE_URL});
  fixture.serviceDb = db;
  fixture.serviceClose = close;
});

describe('workspace tenant isolation', () => {
  it('prevents a user from reading another workspace project', async () => {
    const owner = await createUserWithWorkspace();
    const outsider = await createUserWithWorkspace();
    const project = await new ProjectRepositoryImpl(fixture.serviceDb).create({
      workspaceId: owner.workspaceId,
      title: 'Tenant secret project',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
    });
    const outsiderClient = await asUser(outsider.userId);
    const result = await outsiderClient.db.query.projects.findFirst({
      where: eq(projects.id, project.id),
    });
    expect(result).toBeUndefined();
  });

  it('allows a member to read and write their own project', async () => {
    const owner = await createUserWithWorkspace();
    const project = await new ProjectRepositoryImpl(fixture.serviceDb).create({
      workspaceId: owner.workspaceId,
      title: 'Visible project',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
    });
    const ownerClient = await asUser(owner.userId);
    const result = await ownerClient.db.query.projects.findFirst({
      where: eq(projects.id, project.id),
    });
    expect(result?.title).toBe('Visible project');

    const updated = await ownerClient.db
      .update(projects)
      .set({title: 'Edited by member'})
      .where(eq(projects.id, project.id))
      .returning();
    expect(updated[0]?.title).toBe('Edited by member');
  });
});

describe('artifact promotion', () => {
  it('promotes one immutable active version and supersedes the previous', async () => {
    const owner = await createUserWithWorkspace();
    const project = await new ProjectRepositoryImpl(fixture.serviceDb).create({
      workspaceId: owner.workspaceId,
      title: 'Promotion project',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
    });
    const repo = new ArtifactRepositoryImpl(fixture.serviceDb);
    const v1 = await repo.promoteVersion({
      projectId: project.id,
      workspaceId: owner.workspaceId,
      artifactType: 'LESSON_PLAN',
      schemaVersion: 1,
      payload: {schemaVersion: 1, title: 'Outline v1'},
      inputHash: 'a'.repeat(64),
    });
    const v2 = await repo.promoteVersion({
      projectId: project.id,
      workspaceId: owner.workspaceId,
      artifactType: 'LESSON_PLAN',
      schemaVersion: 1,
      payload: {schemaVersion: 1, title: 'Outline v2'},
      inputHash: 'b'.repeat(64),
    });
    expect(v1.id).not.toBe(v2.id);
    const active = await repo.getActiveVersion<{title: string}>({
      projectId: project.id,
      workspaceId: owner.workspaceId,
      artifactType: 'LESSON_PLAN',
    });
    expect(active?.payload.title).toBe('Outline v2');
    const history = await fixture.serviceDb.query.lessonPlanVersions.findMany({
      where: eq(lessonPlanVersions.projectId, project.id),
      orderBy: (row, {asc}) => [asc(row.createdAt)],
    });
    expect(history).toHaveLength(2);
    expect(history[0]?.isActive).toBe(false);
    expect(history[1]?.isActive).toBe(true);
    expect(history[0]?.payload).toEqual({schemaVersion: 1, title: 'Outline v1'});
  });
});
