import {createHmac, timingSafeEqual} from 'node:crypto';
import {and, eq} from 'drizzle-orm';
import {renders, type Database} from '@motionknowledge/database';

const SIGNING_SECRET = process.env.DOWNLOAD_SIGNING_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? 'local-dev-download-secret';

export interface RenderDownload {
  render: typeof renders.$inferSelect;
  kind: string;
  objectKey: string | null;
}

export async function resolveRenderDownload(
  db: Database,
  input: {projectId: string; renderId: string; workspaceId: string; kind: string},
): Promise<RenderDownload | null> {
  const rows = await db.select().from(renders).where(eq(renders.id, input.renderId)).limit(1);
  const render = rows[0];
  if (!render || String(render.projectId) !== input.projectId || String(render.workspaceId) !== input.workspaceId) {
    return null;
  }
  const keyByKind: Record<string, string | null | undefined> = {
    mp4: render.mp4Key,
    srt: render.srtKey,
    transcript: render.transcriptKey,
    thumbnail: render.thumbnailKey,
    chapters: render.chaptersKey,
    metadata: render.metadataKey,
  };
  return {render, kind: input.kind, objectKey: keyByKind[input.kind] ?? null};
}

export function signObjectUrl(objectKey: string, expiresInSeconds = 300): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${objectKey}|${expires}`;
  const sig = createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
  return `/api/objects/${objectKey}?expires=${expires}&sig=${sig}`;
}

export function verifyObjectSignature(objectKey: string, expires: number, sig: string): boolean {
  const expected = createHmac('sha256', SIGNING_SECRET).update(`${objectKey}|${expires}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  return expires > Math.floor(Date.now() / 1000);
}

export async function listProjectRenders(db: Database, projectId: string) {
  return db.select().from(renders).where(and(eq(renders.projectId, projectId), eq(renders.kind, 'FINAL'))).orderBy(renders.createdAt);
}

export async function listProjectSources(db: Database, projectId: string) {
  const {sources} = await import('@motionknowledge/database');
  return db.select().from(sources).where(eq(sources.projectId, projectId));
}
