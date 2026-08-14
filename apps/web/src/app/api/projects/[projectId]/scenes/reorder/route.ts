import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../services/projects';
import {reorderScenes} from '../../../../../../services/artifacts';
import {track} from '@motionknowledge/analytics';

const ReorderSchema = z.object({
  orderedSceneKeys: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = await request.json().catch(() => ({}));
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    await reorderScenes(db, {projectId, workspaceId, orderedSceneKeys: parsed.data.orderedSceneKeys});
    track({event: 'scenes_reordered', userId: user.id, workspaceId, projectId});
    return NextResponse.json({reordered: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'reorder failed'}, {status: 400});
  }
}
