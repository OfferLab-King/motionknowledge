import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {eq} from 'drizzle-orm';
import {projects as projectsTable} from '@motionknowledge/database';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../../services/projects';
import {retrySourceIngestion} from '../../../../../../../services/sources';
import {track} from '@motionknowledge/analytics';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string; sourceId: string}>}) {
  const {projectId, sourceId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: eq(projectsTable.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    const {jobId} = await retrySourceIngestion(db, {workspaceId, projectId, sourceId});
    track({event: 'artifact_generated', userId: user.id, workspaceId, projectId, properties: {sourceId, retried: 'true'}});
    return NextResponse.json({jobId, enqueued: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'retry failed'}, {status: 400});
  }
}
