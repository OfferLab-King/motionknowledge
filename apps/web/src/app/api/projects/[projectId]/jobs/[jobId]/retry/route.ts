import {NextResponse} from 'next/server';
import {eq} from 'drizzle-orm';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../../services/projects';
import {retryJob} from '../../../../../../../services/jobs';
import {track} from '@motionknowledge/analytics';
import {projects as projectsTable} from '@motionknowledge/database';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string; jobId: string}>}) {
  const {projectId, jobId} = await params;
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
    const {jobId: retriedId} = await retryJob(db, {workspaceId, projectId, jobId});
    track({event: 'scene_regenerated', userId: user.id, workspaceId, projectId, properties: {retriedJob: jobId}});
    return NextResponse.json({jobId: retriedId, enqueued: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'retry failed'}, {status: 400});
  }
}
