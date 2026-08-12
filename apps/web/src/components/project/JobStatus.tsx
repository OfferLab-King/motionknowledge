import {StatusPill} from '@motionknowledge/ui';

export interface JobView {
  id: string;
  operation: string;
  status: string;
  attempt: number;
  errorCode: string | null;
  safeError: string | null;
}

export function JobStatus({jobs}: {jobs: JobView[]}) {
  if (jobs.length === 0) return null;
  const latest = [...jobs].reverse().slice(0, 6);
  return (
    <div className="rounded-lg border border-[#2a4568] bg-[#0a1526] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[#f8fafc]">Recent jobs</h3>
      <ul className="space-y-1">
        {latest.map((job) => (
          <li key={job.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#9fb2c8]">{job.operation.replace(/_/g, ' ').toLowerCase()}</span>
            <StatusPill status={job.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
