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

interface QaCheckView {
  code: string;
  passed: boolean;
  critical: boolean;
  message: string;
}

interface SourceView {
  id: string;
  title: string;
  kind: string;
  status: string;
  failureReason: string | null;
}

interface QaView {
  passed: boolean;
  evaluatedAt: string;
  checks: QaCheckView[];
}

interface ProjectStatusData {
  status: string;
  stages: StageStatus[];
  jobs: JobView[];
  sceneProgress: {ready: number; total: number};
  finalRenderStatus: string | null;
  renderProgress: number | null;
  latestPreview: {renderId: string; durationSeconds: number | null} | null;
  previewStale: boolean;
  sources: SourceView[];
  narrationModel: string | null;
  qa: QaView | null;
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
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);

  async function regeneratePreview() {
    setPreviewBusy(true);
    setPreviewDone(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/preview/regenerate`, {method: 'POST'});
      if (response.ok) setPreviewDone(true);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function retrySource(sourceId: string) {
    await fetch(`/api/projects/${projectId}/sources/${sourceId}/retry`, {method: 'POST'});
  }
  const complete = data.status === 'COMPLETE';

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
        <StageRail stages={stagesToRail(data.stages, projectId)} active="sources" />
        <div className="mt-6">
          <JobStatus jobs={data.jobs} projectId={projectId} />
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
              <>
                <button
                  type="button"
                  disabled={previewBusy}
                  onClick={() => void regeneratePreview()}
                  className="rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#f8fafc] hover:bg-[#1a3050] disabled:opacity-50"
                >
                  {previewBusy ? 'Enqueuing…' : 'Regenerate preview'}
                </button>
                <Link
                  href={`/projects/${projectId}/exports`}
                  className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
                >
                  {complete ? 'View exports' : 'Final render'}
                </Link>
              </>
            ) : null}
          </div>
          {previewDone ? (
            <p className="mt-2 text-xs text-[#4ade80]">Preview regeneration enqueued — status will update as it renders.</p>
          ) : null}
          {data.renderProgress != null ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-[#9fb2c8]">
                <span>Rendering…</span>
                <span>{data.renderProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#0a1526]">
                <div
                  className="h-full rounded-full bg-[#59d5e0] transition-all"
                  style={{width: `${Math.max(2, data.renderProgress)}%`}}
                />
              </div>
            </div>
          ) : null}
        </div>
        {data.qa ? (
          <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f8fafc]">QA checks</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${data.qa.passed ? 'bg-[#10213a] text-[#4ade80]' : 'bg-[#10213a] text-[#fb7185]'}`}>
                {data.qa.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {data.qa.checks.map((check) => (
                <li key={check.code} className="flex items-center justify-between gap-2 rounded bg-[#0a1526] px-2 py-1 text-xs">
                  <span className="truncate text-[#9fb2c8]">
                    {check.code.replace(/_/g, ' ').toLowerCase()}
                    {check.critical ? ' · critical' : ''}
                    {check.message ? <span className="ml-1 text-[10px] text-[#64748b]">— {check.message}</span> : null}
                  </span>
                  <span className={check.passed ? 'text-[#4ade80]' : 'text-[#fb7185]'}>{check.passed ? '✓' : '✕'}</span>
                </li>
              ))}
            </ul>
            {!data.qa.passed ? (
              <p className="mt-2 text-xs text-[#9fb2c8]">Regenerate the preview to re-run these checks.</p>
            ) : null}
          </div>
        ) : null}
        {data.previewStale ? (
          <div className="rounded-lg border border-[#f7c948]/40 bg-[#1a1a10] p-3 text-xs text-[#f7c948]">
            The preview is out of date — scenes or narration changed since it was rendered. Regenerate it
            before QA or review.
          </div>
        ) : null}
        {data.sources.length > 0 ? (
          <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
            <h3 className="mb-2 text-sm font-semibold text-[#f8fafc]">Sources</h3>
            <ul className="space-y-1">
              {data.sources.map((source) => (
                <li key={source.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-[#9fb2c8]">{source.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-[#64748b]">{source.kind}</span>
                    {source.status === 'FAILED' ? (
                      <>
                        <span className="text-[#fb7185]">failed{source.failureReason ? `: ${source.failureReason.slice(0, 60)}` : ''}</span>
                        <button
                          type="button"
                          onClick={() => void retrySource(source.id)}
                          className="rounded bg-[#10213a] px-2 py-0.5 font-semibold text-[#59d5e0] hover:bg-[#1a3050]"
                        >
                          Retry
                        </button>
                      </>
                    ) : source.status === 'PROCESSED' ? (
                      <span className="text-[#4ade80]">processed</span>
                    ) : (
                      <span className="text-[#f7c948]">{source.status.toLowerCase()}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-[#9fb2c8]">
          Status updates automatically every few seconds — no refresh needed.
        </p>
      </div>
    </div>
  );
}
