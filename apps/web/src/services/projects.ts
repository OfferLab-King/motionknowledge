'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {eq} from 'drizzle-orm';
import {
  workspaces,
  workspaceMemberships,
  projects as projectsTable,
  sources,
  subscriptions,
  type Database,
} from '@motionknowledge/database';
import {ProjectRepositoryImpl} from '@motionknowledge/database';
import {z} from 'zod';
import {getServiceDb} from '../lib/db';
import {getSessionUser} from '../lib/supabase/auth';
import {track} from '@motionknowledge/analytics';

const CreateProjectSchema = z.object({
  title: z.string().min(3, 'Topic must be at least 3 characters').max(200),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  targetDurationMinutes: z.enum(['3', '5', '10']),
  language: z.string().min(2).max(8).default('en'),
  tone: z.string().min(2).max(40).default('professional'),
  style: z.string().min(2).max(40).default('professional'),
  aspectRatio: z.enum(['16:9', '9:16']),
  voice: z.string().min(1).max(80).default('Samantha'),
});

export interface WorkspaceMembership {
  workspaceId: string;
  role: string;
}

export async function getWorkspaceMemberships(userId: string, db: Database): Promise<WorkspaceMembership[]> {
  const rows = await db
    .select({workspaceId: workspaceMemberships.workspaceId, role: workspaceMemberships.role})
    .from(workspaceMemberships)
    .where(eq(workspaceMemberships.userId, userId));
  return rows;
}

export async function ensureWorkspaceForUser(userId: string, db: Database): Promise<WorkspaceMembership> {
  const memberships = await getWorkspaceMemberships(userId, db);
  if (memberships[0]) return memberships[0];
  const workspace = await db.insert(workspaces).values({name: 'My workspace'}).returning();
  await db.insert(workspaceMemberships).values({workspaceId: workspace[0]!.id, userId, role: 'owner'});
  await db.insert(subscriptions).values({workspaceId: workspace[0]!.id, status: 'free', plan: 'free'}).onConflictDoNothing();
  return {workspaceId: workspace[0]!.id, role: 'owner'};
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  const parsed = CreateProjectSchema.safeParse({
    title: formData.get('title'),
    audienceLevel: formData.get('audienceLevel'),
    targetDurationMinutes: formData.get('duration'),
    language: formData.get('language') ?? 'en',
    tone: formData.get('tone') ?? 'professional',
    style: formData.get('style') ?? 'professional',
    aspectRatio: formData.get('aspectRatio') ?? '16:9',
    voice: formData.get('voice') ?? 'Samantha',
  });
  if (!parsed.success) {
    redirect('/projects/new?error=invalid');
  }
  const db = getServiceDb();
  const membership = await ensureWorkspaceForUser(user.id, db);
  const repo = new ProjectRepositoryImpl(db);
  const project = await repo.create({
    workspaceId: membership.workspaceId,
    title: parsed.data.title,
    audienceLevel: parsed.data.audienceLevel,
    targetDurationSeconds: Number(parsed.data.targetDurationMinutes) * 60,
    language: parsed.data.language,
    tone: parsed.data.tone,
    style: parsed.data.style,
    aspectRatio: parsed.data.aspectRatio,
    voice: parsed.data.voice,
  });
  await db
    .insert(sources)
    .values({
      projectId: project.id,
      workspaceId: membership.workspaceId,
      kind: 'text',
      title: parsed.data.title,
      rawSha256: '0'.repeat(64),
      normalizedSha256: '0'.repeat(64),
      language: parsed.data.language,
      byteCount: 0,
      status: 'PENDING',
    })
    .onConflictDoNothing();

  const {getQueue} = await import('../lib/jobs');
  const {computeInputHash, buildIdempotencyKey} = await import('@motionknowledge/jobs');
  const queue = await getQueue();
  const inputHash = computeInputHash({projectId: project.id, topic: parsed.data.title});
  await queue.enqueue({
    jobId: `${project.id}-research`,
    workspaceId: membership.workspaceId,
    projectId: project.id,
    operation: 'RESEARCH_PROJECT',
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId: membership.workspaceId,
      projectId: project.id,
      operation: 'RESEARCH_PROJECT',
      inputHash,
    }),
    payload: {workspaceId: membership.workspaceId, projectId: project.id},
  });

  track({event: 'project_created', userId: user.id, workspaceId: membership.workspaceId, projectId: project.id});
  revalidatePath('/dashboard');
  redirect(`/projects/${project.id}`);
}

export async function listProjectsForUser(userId: string, db: Database) {
  const memberships = await getWorkspaceMemberships(userId, db);
  const membership = memberships[0];
  if (!membership) return [];
  return db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.workspaceId, membership.workspaceId))
    .orderBy(projectsTable.createdAt);
}
