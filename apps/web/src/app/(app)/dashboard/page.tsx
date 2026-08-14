import Link from 'next/link';
import {Card, StatusPill} from '@motionknowledge/ui';
import {getServiceDb} from '../../../lib/db';
import {getSessionUser} from '../../../lib/supabase/auth';
import {listProjectsForUser} from '../../../services/projects';
import {getStyleDefinition} from '@motionknowledge/visual-library/style';
import {getFormat} from '@motionknowledge/content-engine/formats';

const FILTERS = [
  {key: 'all', label: 'All', matches: () => true},
  {key: 'in-progress', label: 'In progress', matches: (status: string) => ['DRAFT', 'RESEARCHING', 'OUTLINE_READY', 'SCRIPT_READY', 'STORYBOARD_READY', 'GENERATING', 'PREVIEW_READY', 'QA_FAILED'].includes(status)},
  {key: 'ready', label: 'Ready', matches: (status: string) => ['READY_FOR_REVIEW', 'APPROVED'].includes(status)},
  {key: 'complete', label: 'Complete', matches: (status: string) => status === 'COMPLETE'},
] as const;

export default async function DashboardPage({searchParams}: {searchParams: Promise<{status?: string}>}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const db = getServiceDb();
  const allProjects = user ? await listProjectsForUser(user.id, db) : [];
  const filterKey = params.status ?? 'all';
  const filter = FILTERS.find((item) => item.key === filterKey) ?? FILTERS[0]!;
  const projects = allProjects.filter((project) => filter.matches(project.status));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Your videos</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
        >
          New video
        </Link>
      </div>
      <div className="mb-4 flex gap-1">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === 'all' ? '/dashboard' : `/dashboard?status=${item.key}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter.key === item.key ? 'bg-[#59d5e0] text-[#08111f]' : 'bg-[#10213a] text-[#9fb2c8] hover:bg-[#1a3050]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {projects.length === 0 ? (
        <Card>
          <p className="mb-4 text-[#9fb2c8]">No projects yet.</p>
          <Link
            href="/projects/new"
            className="inline-block rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f]"
          >
            Create your first video
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const style = getStyleDefinition(project.styleId ?? 'signature');
            const format = getFormat(project.format ?? 'explainer');
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:border-[#59d5e0]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[#f8fafc]">{project.title}</h3>
                      <p className="mt-1 text-sm text-[#9fb2c8]">
                        {Math.round(project.targetDurationSeconds / 60)} min · {project.audienceLevel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {style ? (
                          <span className="rounded bg-[#10213a] px-1.5 py-0.5 text-[10px] text-[#59d5e0]">{style.name}</span>
                        ) : null}
                        {format ? (
                          <span className="rounded bg-[#10213a] px-1.5 py-0.5 text-[10px] text-[#9fb2c8]">{format.name}</span>
                        ) : null}
                      </div>
                    </div>
                    <StatusPill status={project.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
