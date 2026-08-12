import {notFound, redirect} from 'next/navigation';
import {getServiceDb} from '../../../../../lib/db';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {getActiveArtifact} from '../../../../../services/artifacts';
import {ArtifactStagePage} from '../../../../../components/project/ArtifactStage';
import {LessonPlanV1, type LessonPlan} from '@motionknowledge/schemas';

export default async function OutlinePage({params}: {params: Promise<{projectId: string}>}) {
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

  const lesson = await getActiveArtifact<LessonPlan>(db, projectId, workspaceId, 'LESSON_PLAN');
  const version = lesson?.schemaVersion;
  const provider = (lesson as LessonPlan & {provider?: string})?.provider ?? null;

  return (
    <ArtifactStagePage
      projectId={projectId}
      projectStatus={project.status}
      active="outline"
      label="Lesson outline"
      artifact={{
        status: lesson ? 'succeeded' : 'queued',
        version: version ? String(version) : null,
        provider,
        costUsd: null,
        json: lesson ? JSON.stringify(lesson, null, 2) : null,
      }}
    />
  );
}
