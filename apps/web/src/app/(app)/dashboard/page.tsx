import Link from 'next/link';
import {Card, CardHeader, StatusPill} from '@motionknowledge/ui';
import {getServiceDb} from '../../../lib/db';
import {getSessionUser} from '../../../lib/supabase/auth';
import {listProjectsForUser} from '../../../services/projects';

export default async function DashboardPage() {
  const user = await getSessionUser();
  const db = getServiceDb();
  const projects = user ? await listProjectsForUser(user.id, db) : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Your projects</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-[#59d5e0] px-4 py-2 font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
        >
          New video
        </Link>
      </div>
      {projects.length === 0 ? (
        <Card>
          <CardHeader title="No projects yet" subtitle="Create your first video from a topic or a source document." />
          <Link
            href="/projects/new"
            className="inline-block rounded-lg bg-[#59d5e0] px-4 py-2 font-semibold text-[#08111f]"
          >
            Create your first video
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:border-[#59d5e0]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#f8fafc]">{project.title}</h3>
                    <p className="mt-1 text-sm text-[#9fb2c8]">
                      {Math.round(project.targetDurationSeconds / 60)} min · {project.audienceLevel}
                    </p>
                  </div>
                  <StatusPill status={project.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
