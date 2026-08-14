import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../../services/projects';
import {SceneRepositoryImpl, scenes as scenesTable} from '@motionknowledge/database';
import {and, eq} from 'drizzle-orm';
import {track} from '@motionknowledge/analytics';

const RestoreSchema = z.object({
  versionId: z.string().min(1),
});

export async function POST(request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = await request.json().catch(() => ({}));
  const parsed = RestoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  const row = (await db.select().from(scenesTable).where(and(eq(scenesTable.projectId, projectId), eq(scenesTable.sceneKey, sceneId))))[0];
  if (!row) return NextResponse.json({error: 'scene not found'}, {status: 404});
  try {
    const restored = await new SceneRepositoryImpl(db).restoreVersion({sceneId: String(row.id), workspaceId, versionId: parsed.data.versionId});
    if (!restored) return NextResponse.json({error: 'version not found'}, {status: 404});
    track({event: 'scene_version_restored', userId: user.id, workspaceId, projectId, properties: {sceneId}});
    return NextResponse.json({restored: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'restore failed'}, {status: 400});
  }
}
