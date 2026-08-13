import {notFound, redirect} from 'next/navigation';
import {getServiceDb} from '../../../../lib/db';
import {getSessionUser} from '../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../services/projects';
import {ProjectWorkflow} from '../../../../components/project/ProjectWorkflow';
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f8fafc]">{project.title}</h1>
        <p className="mt-1 text-sm text-[#9fb2c8]">
          {Math.round(project.targetDurationSeconds / 60)} min · {project.audienceLevel}
        </p>
      </div>
      <ProjectWorkflow
        projectId={projectId}
        projectTitle={project.title}
        initial={{
          status: project.status,
          stages: [
            {key: 'sources', label: 'Sources & claims', status: 'succeeded', version: null, provider: null, costUsd: null},
            {key: 'outline', label: 'Lesson outline', status: null, version: null, provider: null, costUsd: null},
            {key: 'script', label: 'Script & chapters', status: null, version: null, provider: null, costUsd: null},
            {key: 'storyboard', label: 'Storyboard', status: null, version: null, provider: null, costUsd: null},
            {key: 'scenes', label: 'Scenes & narration', status: null, version: null, provider: null, costUsd: null},
            {key: 'preview', label: 'Preview & QA', status: null, version: null, provider: null, costUsd: null},
            {key: 'render', label: 'Final render', status: null, version: null, provider: null, costUsd: null},
          ],
          jobs: jobs.map((job) => ({
            id: job.id,
            operation: job.operation,
            status: job.status,
            attempt: job.attempt,
            errorCode: job.errorCode,
            safeError: job.safeError,
          })),
          sceneProgress: {ready: 0, total: 0},
          finalRenderStatus: null,
          narrationModel: null,
        }}
      />
    </div>
  );
}
