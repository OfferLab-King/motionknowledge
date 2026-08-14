import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../../services/projects';
import {duplicateScene} from '../../../../../../../services/artifacts';
import {track} from '@motionknowledge/analytics';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    const scene = await duplicateScene(db, {projectId, workspaceId, sceneKey: sceneId});
    track({event: 'scene_duplicated', userId: user.id, workspaceId, projectId, properties: {sceneId}});
    return NextResponse.json({scene});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'duplicate failed'}, {status: 400});
  }
}
