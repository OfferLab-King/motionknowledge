import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../../lib/db';
import {getWorkspaceMemberships, resolveWorkspaceId} from '../../../../../services/projects';
import {listProjectRenders, listProjectSources} from '../../../../../services/downloads';

export async function GET(_request: Request, {params}: {params: Promise<{projectId: string}>}) {
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
  const renders = await listProjectRenders(db, projectId);
  const sources = await listProjectSources(db, projectId);
  return NextResponse.json({
    projectStatus: project.status,
    renders: renders.map((render) => ({
      renderId: render.id,
      status: render.status,
      createdAt: render.createdAt,
      durationSeconds: render.durationSeconds,
      width: render.width,
      height: render.height,
      files: [
        ...(render.mp4Key ? [{kind: 'mp4', label: 'MP4', fileName: 'video.mp4'}] : []),
        ...(render.srtKey ? [{kind: 'srt', label: 'SRT', fileName: 'video.srt'}] : []),
        ...(render.transcriptKey ? [{kind: 'transcript', label: 'Transcript', fileName: 'transcript.txt'}] : []),
        ...(render.chaptersKey ? [{kind: 'chapters', label: 'Chapters', fileName: 'chapters.txt'}] : []),
        ...(render.thumbnailKey ? [{kind: 'thumbnail', label: 'Thumbnail', fileName: 'thumbnail.png'}] : []),
        ...(render.metadataKey ? [{kind: 'metadata', label: 'Metadata', fileName: 'render-metadata.json'}] : []),
      ],
    })),
    sources: sources.map((source) => ({id: source.id, title: source.title, kind: source.kind, originalUrl: source.originalUrl})),
  });
}
