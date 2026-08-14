import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../../services/projects';
import {enqueueSceneRegeneration} from '../../../../../../../services/scenes';
import {track} from '@motionknowledge/analytics';

const RegenerateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  narration: z.string().min(1).max(10_000).optional(),
  durationSeconds: z.number().positive().max(600).optional(),
});

export async function POST(request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = await request.json().catch(() => ({}));
  const parsed = RegenerateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  try {
    const {jobId} = await enqueueSceneRegeneration(db, {
      workspaceId,
      projectId,
      sceneKey: sceneId,
      patch: parsed.data,
    });
    track({event: 'scene_regenerated', userId: user.id, workspaceId, projectId, properties: {sceneId}});
    return NextResponse.json({jobId, enqueued: true});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'enqueue failed'}, {status: 400});
  }
}
