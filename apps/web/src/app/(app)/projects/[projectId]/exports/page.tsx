import {notFound, redirect} from 'next/navigation';
import Link from 'next/link';
import {Card, CardHeader} from '@motionknowledge/ui';
import {getServiceDb} from '../../../../../lib/db';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {listProjectRenders, listProjectSources} from '../../../../../services/downloads';
import {getProjectUsage} from '../../../../../services/usage';
import {ExportPanel, type ExportView} from '../../../../../components/project/ExportPanel';
import {UsageSummary} from '../../../../../components/project/UsageSummary';

export default async function ExportsPage({params}: {params: Promise<{projectId: string}>}) {
  const {projectId} = await params;
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const db = getServiceDb();
  const memberships = await getWorkspaceMemberships(user.id, db);
  const workspaceId = memberships[0]?.workspaceId;
  const project = workspaceId
    ? await db.query.projects.findFirst({where: (t, {eq}) => eq(t.id, projectId)})
    : undefined;
  if (!project || String(project.workspaceId) !== workspaceId) notFound();

  const renders = await listProjectRenders(db, projectId);
  const sources = await listProjectSources(db, projectId);
  const usage = await getProjectUsage(db, projectId, workspaceId);

  const renderViews: ExportView[] = renders.map((render) => ({
    renderId: render.id,
    status: render.status,
    createdAt: render.createdAt.toISOString(),
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
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Exports</h1>
        <Link href={`/projects/${projectId}`} className="text-sm text-[#59d5e0]">
          ← Back to project
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ExportPanel projectId={projectId} initialRenders={renderViews} projectStatus={project.status} />
          <Card>
            <CardHeader title="Sources" subtitle="The material this project is grounded in." />
            {sources.length === 0 ? (
              <p className="text-sm text-[#9fb2c8]">No sources recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm text-[#f8fafc]">
                {sources.map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-4">
                    <span>{source.title}</span>
                    <span className="text-xs text-[#9fb2c8]">
                      {source.kind}
                      {source.originalUrl ? ' · link' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <UsageSummary usage={usage} />
      </div>
    </div>
  );
}
