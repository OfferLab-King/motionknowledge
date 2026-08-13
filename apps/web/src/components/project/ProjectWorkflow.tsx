'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {StatusPill} from '@motionknowledge/ui';
import {StageRail, type Stage} from './StageRail';
import {JobStatus} from './JobStatus';

interface StageStatus {
  key: string;
  label: string;
  status: string | null;
  version: string | null;
  provider: string | null;
  costUsd: string | null;
}

interface JobView {
  id: string;
  operation: string;
  status: string;
  attempt: number;
  errorCode: string | null;
  safeError: string | null;
}

interface ProjectStatusData {
  status: string;
  stages: StageStatus[];
  jobs: JobView[];
  sceneProgress: {ready: number; total: number};
  finalRenderStatus: string | null;
  narrationModel: string | null;
}

const STATUS_MESSAGE: Record<string, string> = {
  DRAFT: 'Project created. The pipeline will start automatically.',
  RESEARCHING: 'Researching sources and extracting claims…',
  OUTLINE_READY: 'Lesson outline ready — reviewing next stages…',
  SCRIPT_READY: 'Script ready — storyboard is being generated…',
  STORYBOARD_READY: 'Storyboard ready — generating scenes and narration…',
  GENERATING: 'Generating scenes, narration, captions, and preview…',
  PREVIEW_READY: 'Preview ready — running QA checks…',
  QA_FAILED: 'Quality checks failed. Inspect the preview and regenerate.',
  READY_FOR_REVIEW: 'Ready for review — open the scene editor or render the final video.',
  APPROVED: 'Approved — rendering the final video…',
  RENDERING: 'Rendering the final video…',
  COMPLETE: 'Complete — exports are available.',
};

function stagesToRail(stages: StageStatus[], projectId: string): Stage[] {
  const hrefFor: Record<string, string> = {
    sources: `/projects/${projectId}`,
    outline: `/projects/${projectId}/outline`,
    script: `/projects/${projectId}/script`,
    storyboard: `/projects/${projectId}/storyboard`,
    scenes: `/projects/${projectId}/editor`,
    preview: `/projects/${projectId}`,
    render: `/projects/${projectId}/exports`,
  };
  return stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    href: hrefFor[stage.key] ?? `/projects/${projectId}`,
    status: stage.status,
    version: stage.version,
    provider: stage.provider,
    costUsd: stage.costUsd,
  }));
}

export function ProjectWorkflow(props: {
  projectId: string;
  projectTitle: string;
  initial: ProjectStatusData;
}) {
  const {projectId, projectTitle} = props;
  const [data, setData] = useState<ProjectStatusData>(props.initial);

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/status`, {cache: 'no-store'});
        if (response.ok && !cancelled) {
          setData((await response.json()) as ProjectStatusData);
        }
      } catch {
        // transient network errors are ignored; the next poll retries
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId]);

  const message = STATUS_MESSAGE[data.status] ?? 'Working…';
  const renderable = data.status === 'READY_FOR_REVIEW' || data.status === 'APPROVED';
  const complete = data.status === 'COMPLETE';

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
        <StageRail stages={stagesToRail(data.stages, projectId)} active="sources" />
        <div className="mt-6">
          <JobStatus jobs={data.jobs} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#f8fafc]">Generation workflow</h2>
              <p className="mt-1 text-sm text-[#9fb2c8]">{message}</p>
              {data.sceneProgress.total > 0 ? (
                <p className="mt-1 text-xs text-[#9fb2c8]">
                  Scenes ready: {data.sceneProgress.ready}/{data.sceneProgress.total}
                  {data.narrationModel ? ` · narration: ${data.narrationModel}` : ''}
                </p>
              ) : null}
            </div>
            <StatusPill status={data.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/outline`}
              className="rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
            >
              Review outline
            </Link>
            <Link
              href={`/projects/${projectId}/editor`}
              className="rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
            >
              Open scene editor
            </Link>
            {renderable || complete ? (
              <Link
                href={`/projects/${projectId}/exports`}
                className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
              >
                {complete ? 'View exports' : 'Final render'}
              </Link>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-[#9fb2c8]">
          Status updates automatically every few seconds — no refresh needed.
        </p>
      </div>
    </div>
  );
}
