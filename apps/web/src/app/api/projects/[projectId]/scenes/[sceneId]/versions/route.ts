import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../../services/projects';
import {listSceneVersions} from '../../../../../../../services/artifacts';

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string; sceneId: string}>}) {
  const {projectId, sceneId} = await params;
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
    const versions = await listSceneVersions(db, projectId, sceneId);
    return NextResponse.json({
      versions: versions.map((version) => ({
        versionId: version.versionId,
        title: version.payload.title,
        narrationPreview: version.payload.narration.slice(0, 120),
        versionNumber: version.payload.sceneVersionId.match(/-v(\d+)$/)?.[1] ?? '1',
        isActive: version.isActive,
        createdAt: version.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'list failed'}, {status: 400});
  }
}
