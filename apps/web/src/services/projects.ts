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
import {isRegisteredStyle, getStyleDefinition} from '@motionknowledge/visual-library/style';
import {isRegisteredTemplate} from '@motionknowledge/content-engine/templates';
import {isRegisteredFormat} from '@motionknowledge/content-engine/formats';

const CreateProjectSchema = z.object({
  title: z.string().min(3, 'Topic must be at least 3 characters').max(200),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  targetDurationMinutes: z.enum(['3', '5', '10']),
  language: z.string().min(2).max(8).default('en'),
  tone: z.string().min(2).max(40).default('professional'),
  aspectRatio: z.enum(['16:9', '9:16']),
  voice: z.string().min(1).max(80).default('Samantha'),
  templateId: z.string().optional(),
  styleId: z.string().optional(),
  format: z.string().optional(),
  sourceType: z.enum(['topic', 'text', 'url', 'file']).optional(),
  sourceText: z.string().max(200_000).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
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
    aspectRatio: formData.get('aspectRatio') ?? '16:9',
    voice: formData.get('voice') ?? 'Samantha',
    templateId: formData.get('templateId') ? String(formData.get('templateId')) : undefined,
    styleId: formData.get('styleId') ? String(formData.get('styleId')) : undefined,
    format: formData.get('format') ? String(formData.get('format')) : undefined,
    sourceType: formData.get('sourceType') ? String(formData.get('sourceType')) : undefined,
    sourceText: formData.get('sourceText') ? String(formData.get('sourceText')) : undefined,
    sourceUrl: formData.get('sourceUrl') ? String(formData.get('sourceUrl')) : undefined,
  });
  if (!parsed.success) {
    redirect('/projects/new?error=invalid');
  }
  const styleId = parsed.data.styleId && isRegisteredStyle(parsed.data.styleId) ? parsed.data.styleId : 'signature';
  const templateId = parsed.data.templateId && isRegisteredTemplate(parsed.data.templateId) ? parsed.data.templateId : null;
  const format = parsed.data.format && isRegisteredFormat(parsed.data.format) ? parsed.data.format : 'explainer';
  const style = getStyleDefinition(styleId);
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
    format,
    templateId,
    styleId,
    aspectRatio: parsed.data.aspectRatio,
    voice: parsed.data.voice,
  });
  const sourceType = parsed.data.sourceType ?? 'topic';
  const sourceText = parsed.data.sourceText?.trim() ?? '';
  const sourceUrl = parsed.data.sourceUrl?.trim() ?? '';
  if (sourceType === 'url' && !sourceUrl) {
    redirect('/projects/new?error=invalid');
  }
  if (sourceType === 'text' && sourceText.length < 40) {
    redirect('/projects/new?error=invalid');
  }

  let initialOperation: 'RESEARCH_PROJECT' | 'INGEST_SOURCE' = 'RESEARCH_PROJECT';
  let initialSourceId: string | null = null;
  if (sourceType === 'text' && sourceText) {
    const rawBytes = new TextEncoder().encode(sourceText);
    const {sha256Hex, hashText} = await import('@motionknowledge/assets');
    const source = await db
      .insert(sources)
      .values({
        projectId: project.id,
        workspaceId: membership.workspaceId,
        kind: 'text',
        title: parsed.data.title,
        rawSha256: sha256Hex(rawBytes),
        normalizedSha256: hashText(sourceText),
        language: parsed.data.language,
        byteCount: rawBytes.byteLength,
        fetchedAt: new Date(),
        status: 'PROCESSED',
      })
      .returning();
    initialSourceId = String(source[0]!.id);
    await storeSourceText(membership.workspaceId, project.id, initialSourceId, sourceText);
  } else if (sourceType === 'url' && sourceUrl) {
    const source = await db
      .insert(sources)
      .values({
        projectId: project.id,
        workspaceId: membership.workspaceId,
        kind: 'url',
        title: parsed.data.title,
        rawSha256: '0'.repeat(64),
        normalizedSha256: '0'.repeat(64),
        originalUrl: sourceUrl,
        language: parsed.data.language,
        byteCount: 0,
        status: 'PENDING',
      })
      .returning();
    initialSourceId = String(source[0]!.id);
    initialOperation = 'INGEST_SOURCE';
  } else if (sourceType === 'file') {
    const file = formData.get('sourceFile');
    if (!(file instanceof File) || file.size === 0) {
      redirect('/projects/new?error=invalid');
    }
    if (file.size > 25_000_000) {
      redirect('/projects/new?error=invalid');
    }
    const {sha256Hex, hashText} = await import('@motionknowledge/assets');
    const {ingestSource, sourceTextKey} = await import('@motionknowledge/research');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {createStorageProvider, localStorageRoot} = await import('@motionknowledge/storage');
    const storage = createStorageProvider({driver: 'local', localRoot: localStorageRoot});
    const kind = kindForFile(file.name, bytes);
    let extracted: string;
    try {
      const ingested = await ingestSource({
        source: {
          schemaVersion: 1,
          id: 'upload-pending',
          projectId: project.id,
          supplied: true,
          kind,
          title: file.name,
          rawSha256: sha256Hex(bytes),
          normalizedSha256: hashText(''),
          originalUrl: null,
          fetchedAt: null,
          language: parsed.data.language,
          byteCount: bytes.byteLength,
          status: 'PENDING',
          failureReason: null,
        } as never,
        bytes,
      });
      extracted = ingested.text;
    } catch (error) {
      redirect('/projects/new?error=invalid');
      return;
    }
    const source = await db
      .insert(sources)
      .values({
        projectId: project.id,
        workspaceId: membership.workspaceId,
        kind,
        title: file.name,
        rawSha256: sha256Hex(bytes),
        normalizedSha256: hashText(extracted),
        language: parsed.data.language,
        byteCount: bytes.byteLength,
        fetchedAt: new Date(),
        status: 'PROCESSED',
      })
      .returning();
    initialSourceId = String(source[0]!.id);
    const {createHash} = await import('node:crypto');
    const rawKey = `${membership.workspaceId}/${project.id}/sources/${initialSourceId}/raw.bin`;
    await storage.put({key: rawKey, body: bytes, contentType: file.type || 'application/octet-stream', sha256: sha256Hex(bytes)});
    const textBody = new TextEncoder().encode(extracted);
    await storage.put({
      key: sourceTextKey(membership.workspaceId, project.id, initialSourceId),
      body: textBody,
      contentType: 'text/plain',
      sha256: createHash('sha256').update(textBody).digest('hex'),
    });
  } else {
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
  }

  const {getQueue} = await import('../lib/jobs');
  const {computeInputHash, buildIdempotencyKey} = await import('@motionknowledge/jobs');
  const queue = await getQueue();
  const inputHash = computeInputHash({projectId: project.id, topic: parsed.data.title, operation: initialOperation});
  await queue.enqueue({
    jobId: `${project.id}-${initialOperation.toLowerCase()}`,
    workspaceId: membership.workspaceId,
    projectId: project.id,
    operation: initialOperation,
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId: membership.workspaceId,
      projectId: project.id,
      operation: initialOperation,
      inputHash,
    }),
    payload: initialOperation === 'INGEST_SOURCE'
      ? {workspaceId: membership.workspaceId, projectId: project.id, sourceId: initialSourceId}
      : {workspaceId: membership.workspaceId, projectId: project.id},
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

/** Change the project's style, bumping the style version. */export async function changeProjectStyleAction(projectId: string, styleId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  if (!isRegisteredStyle(styleId)) throw new Error(`Unknown style: ${styleId}`);
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) throw new Error('No workspace');
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) throw new Error('Project not found');
  const style = getStyleDefinition(styleId);
  const repo = new ProjectRepositoryImpl(db);
  await repo.updateStyle({projectId, workspaceId, styleId, styleVersion: style?.version ?? 1});
  revalidatePath(`/projects/${projectId}`);
}

/** Rename a project. */
export async function renameProjectAction(projectId: string, title: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const clean = title.trim();
  if (clean.length < 3 || clean.length > 200) throw new Error('Title must be 3–200 characters');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) throw new Error('No workspace');
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) throw new Error('Project not found');
  await new ProjectRepositoryImpl(db).updateTitle({projectId, workspaceId, title: clean});
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');
}

/** Delete a project and all its artifacts, scenes, jobs and renders. */
export async function deleteProjectAction(projectId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) throw new Error('No workspace');
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) throw new Error('Project not found');
  await new ProjectRepositoryImpl(db).deleteProject({projectId, workspaceId});
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/** Duplicate a project: same settings, fresh pipeline. */
export async function duplicateProjectAction(projectId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) throw new Error('No workspace');
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) throw new Error('Project not found');
  const repo = new ProjectRepositoryImpl(db);
  const copy = await repo.create({
    workspaceId,
    title: `${project.title} (copy)`,
    audienceLevel: project.audienceLevel,
    targetDurationSeconds: project.targetDurationSeconds,
    language: project.language,
    tone: project.tone,
    format: project.format ?? 'explainer',
    templateId: project.templateId ?? null,
    styleId: project.styleId ?? 'signature',
    aspectRatio: project.aspectRatio ?? '16:9',
    voice: project.voice ?? 'Samantha',
  });
  await db
    .insert(sources)
    .values({
      projectId: copy.id,
      workspaceId,
      kind: 'text',
      title: copy.title,
      rawSha256: '0'.repeat(64),
      normalizedSha256: '0'.repeat(64),
      language: copy.language,
      byteCount: 0,
      status: 'PENDING',
    })
    .onConflictDoNothing();
  const {getQueue} = await import('../lib/jobs');
  const {computeInputHash, buildIdempotencyKey} = await import('@motionknowledge/jobs');
  const queue = await getQueue();
  const inputHash = computeInputHash({projectId: copy.id, topic: copy.title, duplicateOf: projectId});
  await queue.enqueue({
    jobId: `${copy.id}-research`,
    workspaceId,
    projectId: copy.id,
    operation: 'RESEARCH_PROJECT',
    inputHash,
    idempotencyKey: buildIdempotencyKey({workspaceId, projectId: copy.id, operation: 'RESEARCH_PROJECT', inputHash}),
    payload: {workspaceId, projectId: copy.id},
  });
  revalidatePath('/dashboard');
  redirect(`/projects/${copy.id}`);
}

async function storeSourceText(workspaceId: string, projectId: string, sourceId: string, text: string): Promise<void> {
  const {createStorageProvider, localStorageRoot} = await import('@motionknowledge/storage');
  const {sourceTextKey} = await import('@motionknowledge/research');
  const storage = createStorageProvider({driver: 'local', localRoot: localStorageRoot});
  const body = new TextEncoder().encode(text);
  const {createHash} = await import('node:crypto');
  const sha256 = createHash('sha256').update(body).digest('hex');
  await storage.put({key: sourceTextKey(workspaceId, projectId, sourceId), body, contentType: 'text/plain', sha256});
}

function kindForFile(name: string, bytes: Uint8Array): 'text' | 'pdf' | 'docx' | 'pptx' | 'csv' | 'json' | 'file' {
  const extension = name.toLowerCase().split('.').at(-1) ?? '';
  const header = String.fromCharCode(...bytes.slice(0, 8));
  if (header.startsWith('%PDF')) return 'pdf';
  if (header.startsWith('PK')) {
    if (extension === 'docx') return 'docx';
    if (extension === 'pptx') return 'pptx';
    return 'file';
  }
  if (header.startsWith('{')) return 'json';
  if (extension === 'csv' || header.includes(',')) return 'csv';
  if (extension === 'md') return 'text';
  if (extension === 'txt') return 'text';
  return 'file';
}

/** Toggle burned (on-video) captions for a project. */
export async function setBurnedCaptionsAction(projectId: string, burnedCaptions: boolean): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) throw new Error('No workspace');
  const project = await db.query.projects.findFirst({where: eq(projectsTable.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) throw new Error('Project not found');
  await db.update(projectsTable).set({burnedCaptions}).where(eq(projectsTable.id, projectId));
  revalidatePath(`/projects/${projectId}`);
}
