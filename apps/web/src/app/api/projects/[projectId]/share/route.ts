import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {resolveWorkspaceId} from '../../../../../services/projects';
import {projectShareTokens} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';

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
  const token = randomBytes(18).toString('hex');
  await db.insert(projectShareTokens).values({token, projectId, workspaceId}).onConflictDoNothing();
  return NextResponse.json({token, url: `/share/${token}`});
}
