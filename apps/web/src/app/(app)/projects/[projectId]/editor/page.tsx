import {notFound, redirect} from 'next/navigation';
import Link from 'next/link';
import {getServiceDb} from '../../../../../lib/db';
import {getSessionUser} from '../../../../../lib/supabase/auth';
import {getWorkspaceMemberships} from '../../../../../services/projects';
import {listScenes} from '../../../../../services/artifacts';
import {EditorShell} from '../../../../../components/editor/EditorShell';





export default async function EditorPage({params}: {params: Promise<{projectId: string}>}) {
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

  const sceneList = await listScenes(db, projectId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#f8fafc]">Scene editor</h1>
        <Link href={`/projects/${projectId}`} className="text-sm text-[#59d5e0]">
          ← Back to project
        </Link>
      </div>
      <EditorShell
        projectId={projectId}
        initialScenes={sceneList.map((item) => ({scene: item.scene, versionNumber: item.versionNumber, status: item.status}))}
        initialManifest={null}
      />
    </div>
  );
}
