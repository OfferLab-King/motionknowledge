import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {eq} from 'drizzle-orm';
import {projects as projectsTable} from '@motionknowledge/database';
import {getWorkspaceMemberships} from '../../../../../../../services/projects';
import {cancelRender} from '../../../../../../../services/jobs';
import {track} from '@motionknowledge/analytics';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string; renderId: string}>}) {
  const {projectId, renderId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: eq(projectsTable.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    const result = await cancelRender(db, {workspaceId, projectId, renderId});
    track({event: 'render_requested', userId: user.id, workspaceId, projectId, properties: {renderId, cancelled: 'true'}});
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'cancel failed'}, {status: 400});
  }
}
