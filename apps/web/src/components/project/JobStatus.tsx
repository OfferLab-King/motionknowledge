'use client';

import {useState} from 'react';
import {StatusPill} from '@motionknowledge/ui';

export interface JobView {
  id: string;
  operation: string;
  status: string;
  attempt: number;
  errorCode: string | null;
  safeError: string | null;
}

export function JobStatus(props: {jobs: JobView[]; projectId: string}) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const jobs = props.jobs;
  if (jobs.length === 0) return null;
  const latest = [...jobs].reverse().slice(0, 6);

  async function retry(jobId: string) {
    setRetrying(jobId);
    setRetryError(null);
    try {
      const response = await fetch(`/api/projects/${props.projectId}/jobs/${jobId}/retry`, {method: 'POST'});
      const data = (await response.json()) as {error?: string};
      if (!response.ok) setRetryError(data.error ?? 'Retry failed');
    } catch {
      setRetryError('Retry failed');
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="rounded-lg border border-[#2a4568] bg-[#0a1526] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[#f8fafc]">Recent jobs</h3>
      <ul className="space-y-1">
        {latest.map((job) => (
          <li key={job.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#9fb2c8]">{job.operation.replace(/_/g, ' ').toLowerCase()}</span>
            <span className="flex items-center gap-2">
              {job.status === 'failed' ? (
                <button
                  type="button"
                  disabled={retrying === job.id}
                  onClick={() => void retry(job.id)}
                  className="rounded bg-[#10213a] px-2 py-0.5 font-semibold text-[#59d5e0] hover:bg-[#1a3050] disabled:opacity-50"
                >
                  {retrying === job.id ? 'Retrying…' : 'Retry'}
                </button>
              ) : null}
              <StatusPill status={job.status} />
            </span>
          </li>
        ))}
      </ul>
      {retryError ? <p className="mt-2 text-xs text-[#fb7185]">{retryError}</p> : null}
    </div>
  );
}
