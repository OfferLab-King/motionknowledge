'use client';

import {useEffect, useState} from 'react';
import {Button, StatusPill} from '@motionknowledge/ui';

export interface ExportFile {
  kind: string;
  label: string;
  fileName: string;
}

export interface ExportView {
  renderId: string;
  status: string;
  progress: number;
  createdAt: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  files: ExportFile[];
}

export function ExportPanel(props: {
  projectId: string;
  initialRenders: ExportView[];
  projectStatus: string;
}) {
  const {projectId} = props;
  const [renders, setRenders] = useState<ExportView[]>(props.initialRenders);
  const [projectStatus, setProjectStatus] = useState(props.projectStatus);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/projects/${projectId}/exports`, {cache: 'no-store'});
    if (response.ok) {
      const data = (await response.json()) as {renders: ExportView[]; projectStatus: string};
      setRenders(data.renders);
      setProjectStatus(data.projectStatus);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function requestRender() {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/render`, {method: 'POST'});
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelRender(renderId: string) {
    await fetch(`/api/projects/${projectId}/renders/${renderId}/cancel`, {method: 'POST'});
    await refresh();
  }

  async function createShareLink() {
    const response = await fetch(`/api/projects/${projectId}/share`, {method: 'POST'});
    if (response.ok) {
      const data = (await response.json()) as {url?: string};
      if (data.url) setShareUrl(`${window.location.origin}${data.url}`);
    }
  }

  const renderable = projectStatus === 'READY_FOR_REVIEW' || projectStatus === 'APPROVED';
  const complete = renders.find((render) => render.status === 'succeeded');
  const rendering = renders.find((render) => render.status === 'rendering');

  return (
    <div className="space-y-4">
      {!complete ? (
        <div className="flex items-center gap-4 rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
          <div className="min-w-0">
            <p className="font-medium text-[#f8fafc]">Final render</p>
            <p className="text-sm text-[#9fb2c8]">
              Project status: {projectStatus.replace(/_/g, ' ').toLowerCase()}
            </p>
            {rendering ? (
              <div className="mt-2 w-56">
                <div className="mb-1 flex justify-between text-xs text-[#9fb2c8]">
                  <span>Rendering…</span>
                  <span>{rendering.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#0a1526]">
                  <div className="h-full rounded-full bg-[#59d5e0] transition-all" style={{width: `${Math.max(2, rendering.progress)}%`}} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="ml-auto">
            <Button type="button" disabled={!renderable || busy} onClick={() => void requestRender()}>
              {rendering ? 'Rendering…' : 'Final render'}
            </Button>
          </div>
        </div>
      ) : null}
      {complete ? (
        <div className="rounded-lg border border-[#4ade80] bg-[#0f1c30] p-4">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-medium text-[#4ade80]">Render complete</span>
            <StatusPill status={complete.status} />
            <span className="text-sm text-[#9fb2c8]">
              {complete.durationSeconds ? `${Math.round(complete.durationSeconds)}s · ` : ''}
              {complete.width && complete.height ? `${complete.width}x${complete.height}` : ''}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {complete.files.map((file) => (
              <a
                key={file.kind}
                href={`/api/projects/${projectId}/downloads/${complete.renderId}?file=${file.kind}`}
                className="rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
                download={file.fileName}
              >
                Download {file.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => void createShareLink()}
              className="rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#59d5e0] hover:bg-[#1a3050]"
            >
              Create share link
            </button>
          </div>
          {shareUrl ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                aria-label="Share link"
                onFocus={(event) => event.target.select()}
                className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-xs text-[#f8fafc] outline-none"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#9fb2c8]">
          {projectStatus === 'READY_FOR_REVIEW' || projectStatus === 'APPROVED'
            ? 'Ready to render — click Final render to enqueue the export.'
            : 'The final render becomes available after the project is approved.'}
        </p>
      )}
      {renders
        .filter((render) => render.status === 'rendering')
        .map((render) => (
          <div key={render.renderId} className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Render in progress</span>
              <button
                type="button"
                onClick={() => void cancelRender(render.renderId)}
                className="rounded bg-[#1a0f1f] px-2 py-1 text-xs font-semibold text-[#fb7185] hover:bg-[#2a1520]"
              >
                Cancel
              </button>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0a1526]">
              <div className="h-full rounded-full bg-[#59d5e0]" style={{width: `${Math.max(2, render.progress)}%`}} />
            </div>
          </div>
        ))}
    </div>
  );
}
