import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../../../../services/projects';
import {ArtifactRepositoryImpl} from '@motionknowledge/database';
import {enqueueArtifactDownstream} from '../../../../../../../services/scenes';
import {track} from '@motionknowledge/analytics';

const ARTIFACT_TYPES = ['lesson-plan', 'script', 'storyboard'] as const;
const ARTIFACT_TYPE_MAP: Record<(typeof ARTIFACT_TYPES)[number], 'LESSON_PLAN' | 'SCRIPT' | 'STORYBOARD'> = {
  'lesson-plan': 'LESSON_PLAN',
  script: 'SCRIPT',
  storyboard: 'STORYBOARD',
};

const RestoreSchema = z.object({
  versionId: z.string().min(1),
});

export async function POST(request: Request, {params}: {params: Promise<{projectId: string; type: string}>}) {
  const {projectId, type: rawType} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!(ARTIFACT_TYPES as ReadonlyArray<string>).includes(rawType)) {
    return NextResponse.json({error: 'unknown artifact type'}, {status: 400});
  }
  const artifactType = ARTIFACT_TYPE_MAP[rawType as (typeof ARTIFACT_TYPES)[number]];
  const body = await request.json().catch(() => ({}));
  const parsed = RestoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const project = await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)});
  if (!project || String(project.workspaceId) !== workspaceId) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  const repo = new ArtifactRepositoryImpl(db);
  const restored = await repo.restoreVersion({projectId, workspaceId, artifactType, versionId: parsed.data.versionId});
  if (!restored) return NextResponse.json({error: 'version not found'}, {status: 404});
  const active = await repo.getActiveVersion<Record<string, unknown>>({projectId, workspaceId, artifactType});
  if (active) {
    await enqueueArtifactDownstream(db, {workspaceId, projectId, artifactType, payload: active.payload});
  }
  track({event: 'artifact_edited', userId: user.id, workspaceId, projectId, properties: {artifactType, restored: 'true'}});
  return NextResponse.json({restored: true});
}
