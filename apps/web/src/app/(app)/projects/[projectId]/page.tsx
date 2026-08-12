import {notFound, redirect} from 'next/navigation';
import {Card} from '@motionknowledge/ui';
import {getServiceDb} from '../../../../lib/db';
import {getSessionUser} from '../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../services/projects';
import {StageRail, type Stage} from '../../../../components/project/StageRail';
import {JobStatus} from '../../../../components/project/JobStatus';
import {listJobs} from '../../../../services/artifacts';

export default async function ProjectPage({params}: {params: Promise<{projectId: string}>}) {
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

  const jobs = await listJobs(db, projectId);
  const stages: Stage[] = [
    {key: 'sources', label: 'Sources & claims', href: `/projects/${projectId}`, status: project.status, version: null, provider: null, costUsd: null},
    {key: 'outline', label: 'Lesson outline', href: `/projects/${projectId}/outline`, status: null, version: null, provider: null, costUsd: null},
    {key: 'script', label: 'Script & chapters', href: `/projects/${projectId}/script`, status: null, version: null, provider: null, costUsd: null},
    {key: 'storyboard', label: 'Storyboard', href: `/projects/${projectId}/storyboard`, status: null, version: null, provider: null, costUsd: null},
    {key: 'scenes', label: 'Scenes & narration', href: `/projects/${projectId}/editor`, status: null, version: null, provider: null, costUsd: null},
    {key: 'render', label: 'Preview & render', href: `/projects/${projectId}`, status: null, version: null, provider: null, costUsd: null},
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f8fafc]">{project.title}</h1>
        <p className="mt-1 text-sm text-[#9fb2c8]">
          {Math.round(project.targetDurationSeconds / 60)} min · {project.audienceLevel} ·{' '}
          {project.status.replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
          <StageRail stages={stages} active="sources" />
          <div className="mt-6">
            <JobStatus
              jobs={jobs.map((job) => ({
                id: job.id,
                operation: job.operation,
                status: job.status,
                attempt: job.attempt,
                errorCode: job.errorCode,
                safeError: job.safeError,
              }))}
            />
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold text-[#f8fafc]">Generation workflow</h2>
            <p className="text-sm text-[#9fb2c8]">
              Each stage produces a versioned, source-grounded artifact. Open a stage to review and
              edit it, then approve it so the next stage runs. When the storyboard is ready, the
              scene editor lets you preview, edit, and regenerate individual scenes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/projects/${projectId}/outline`} className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f]">
                Review outline
              </a>
              <a href={`/projects/${projectId}/editor`} className="rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#f8fafc]">
                Open scene editor
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
