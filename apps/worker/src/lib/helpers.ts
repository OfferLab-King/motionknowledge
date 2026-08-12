import {and, eq} from 'drizzle-orm';
import {
  projects,
  sources,
  generationJobs,
  renders,
  type Database,
} from '@motionknowledge/database';
import {transitionProjectStatus, type ProjectStatus} from '@motionknowledge/schemas';
import type {JobEnvelope, JobName} from '@motionknowledge/jobs';
import type {WorkerDeps} from '../deps';

export type Handler<TPayload> = (input: {
  envelope: JobEnvelope<TPayload>;
  payload: TPayload;
  deps: WorkerDeps;
}) => Promise<void>;

export async function markJobSucceeded(db: Database, idempotencyKey: string): Promise<void> {
  await db
    .update(generationJobs)
    .set({status: 'succeeded', completedAt: new Date()})
    .where(eq(generationJobs.idempotencyKey, idempotencyKey));
}

export async function markJobFailed(db: Database, idempotencyKey: string, code: string, safeError: string): Promise<void> {
  await db
    .update(generationJobs)
    .set({status: 'failed', errorCode: code, safeError, completedAt: new Date()})
    .where(eq(generationJobs.idempotencyKey, idempotencyKey));
}

export async function transitionProject(db: Database, projectId: string, workspaceId: string, from: ProjectStatus, to: ProjectStatus): Promise<void> {
  transitionProjectStatus(from, to);
  await db
    .update(projects)
    .set({status: to})
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
}

export async function loadAuthorizedProject(db: Database, projectId: string, workspaceId: string): Promise<typeof projects.$inferSelect | null> {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadActiveArtifact<T>(db: Database, projectId: string, workspaceId: string, artifactType: Parameters<import('@motionknowledge/database').ArtifactRepository['getActiveVersion']>[0]['artifactType']): Promise<T | null> {
  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(db);
  const version = await repo.getActiveVersion<{payload: T}>({projectId, workspaceId, artifactType});
  return (version?.payload as unknown as {payload?: T})?.payload ?? null;
}

export async function loadSourceForProject(db: Database, projectId: string): Promise<typeof sources.$inferSelect | null> {
  const rows = await db.select().from(sources).where(eq(sources.projectId, projectId)).limit(1);
  return rows[0] ?? null;
}

export async function loadLatestRender(db: Database, projectId: string, kind: 'PREVIEW' | 'FINAL'): Promise<typeof renders.$inferSelect | null> {
  const rows = await db
    .select()
    .from(renders)
    .where(and(eq(renders.projectId, projectId), eq(renders.kind, kind)))
    .orderBy(renders.createdAt);
  return rows.at(-1) ?? null;
}

export type {JobName};
