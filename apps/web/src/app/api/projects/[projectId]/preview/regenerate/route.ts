import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../services/projects';
import {enqueuePreviewRegeneration} from '../../../../../../services/jobs';
import {track} from '@motionknowledge/analytics';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    const {jobId} = await enqueuePreviewRegeneration(db, {workspaceId, projectId});
    track({event: 'preview_generated', userId: user.id, workspaceId, projectId, properties: {regenerated: 'true'}});
    return NextResponse.json({jobId, enqueued: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'enqueue failed'}, {status: 400});
  }
}
