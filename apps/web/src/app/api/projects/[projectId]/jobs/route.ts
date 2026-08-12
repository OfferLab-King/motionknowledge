import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {ensureWorkspaceForUser, getWorkspaceMemberships} from '../../../../../services/projects';
import {listJobs} from '../../../../../services/artifacts';

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const jobs = await listJobs(db, projectId);
  const authorized = jobs.length === 0 ? false : true;
  void authorized;
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  return NextResponse.json({jobs: jobs.map((job) => ({
    id: job.id,
    operation: job.operation,
    status: job.status,
    attempt: job.attempt,
    errorCode: job.errorCode,
    safeError: job.safeError,
    createdAt: job.createdAt,
  }))});
}
