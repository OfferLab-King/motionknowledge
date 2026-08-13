import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {eq} from 'drizzle-orm';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {getQueue} from '../../../../../lib/jobs';
import {computeInputHash, buildIdempotencyKey} from '@motionknowledge/jobs';
import {projects} from '@motionknowledge/database';
import {track} from '@motionknowledge/analytics';

export async function POST(_request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
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
  if (project.status !== 'APPROVED' && project.status !== 'READY_FOR_REVIEW') {
    return NextResponse.json({error: `project status ${project.status} is not renderable`}, {status: 409});
  }
  await db
    .update(projects)
    .set({status: 'APPROVED'})
    .where(eq(projects.id, projectId));
  const queue = await getQueue();
  const inputHash = computeInputHash({projectId, nonce: Date.now()});
  const result = await queue.enqueue({
    jobId: `${projectId}-render-final`,
    workspaceId,
    projectId,
    operation: 'RENDER_FINAL',
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId,
      projectId,
      operation: 'RENDER_FINAL',
      inputHash,
      nonce: String(Date.now()),
    }),
    payload: {workspaceId, projectId},
  });
  track({
    event: 'render_requested',
    userId: user.id,
    workspaceId,
    projectId,
    properties: {renderId: result.id},
  });
  return NextResponse.json({jobId: result.id, enqueued: true});
}
