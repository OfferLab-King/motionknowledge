import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../../services/projects';
import {resolveRenderDownload, signObjectUrl} from '../../../../../../services/downloads';
import {trackExportDownload} from '../../../../../../services/analytics-helpers';

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string; renderId: string}>}) {
  const {projectId, renderId} = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const url = new URL(_request.url);
  const kind = url.searchParams.get('file') ?? 'mp4';
  if (!['mp4', 'srt', 'transcript', 'thumbnail', 'chapters', 'metadata'].includes(kind)) {
    return NextResponse.json({error: 'invalid file kind'}, {status: 400});
  }
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});
  const download = await resolveRenderDownload(db, {projectId, renderId, workspaceId, kind});
  if (!download || !download.objectKey) {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
  trackExportDownload({userId: user.id, workspaceId, projectId, renderId, kind});
  return NextResponse.json({url: signObjectUrl(download.objectKey, 300), kind, expiresInSeconds: 300});
}
