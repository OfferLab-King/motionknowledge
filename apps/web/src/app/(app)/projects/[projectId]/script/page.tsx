import {notFound, redirect} from 'next/navigation';
import {getServiceDb} from '../../../../../lib/db';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {getActiveArtifact} from '../../../../../services/artifacts';
import {ArtifactStagePage} from '../../../../../components/project/ArtifactStage';
import type {Script} from '@motionknowledge/schemas';

export default async function ScriptPage({params}: {params: Promise<{projectId: string}>}) {
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

  const script = await getActiveArtifact<Script>(db, projectId, workspaceId, 'SCRIPT');
  const version = script?.schemaVersion;
  const provider = (script as Script & {provider?: string})?.provider ?? null;

  return (
    <ArtifactStagePage
      projectId={projectId}
      projectStatus={project.status}
      active="script"
      label="Script & chapters"
      artifact={{
        status: script ? 'succeeded' : 'queued',
        version: version ? String(version) : null,
        provider,
        costUsd: null,
        json: script ? JSON.stringify(script, null, 2) : null,
      }}
    />
  );
}
