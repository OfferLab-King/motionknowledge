'use client';

import {useEffect, useState} from 'react';

export interface LatestPreview {
  renderId: string;
  durationSeconds: number | null;
}

/**
 * Plays the latest QA'd preview render, refreshed by the status poll. This is
 * the "inspect the preview" loop after QA_FAILED or after scene edits.
 */
export function PreviewPlayback(props: {projectId: string; initialPreview: LatestPreview | null}) {
  const [preview, setPreview] = useState<LatestPreview | null>(props.initialPreview);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${props.projectId}/status`, {cache: 'no-store'});
        if (response.ok) {
          const data = (await response.json()) as {latestPreview: LatestPreview | null};
          setPreview(data.latestPreview);
        }
      } catch {
        // transient errors ignored; next poll retries
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [props.projectId]);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!preview) return;
    fetch(`/api/projects/${props.projectId}/downloads/${preview.renderId}?file=mp4`, {cache: 'no-store'})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {url?: string} | null) => {
        if (data?.url && !cancelled) setSrc(data.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [preview?.renderId, props.projectId]);

  return (
    <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f8fafc]">Latest preview</h3>
        {preview?.durationSeconds ? (
          <span className="text-xs text-[#9fb2c8]">{Math.round(preview.durationSeconds)}s</span>
        ) : null}
      </div>
      {src ? (
        <video src={src} controls className="w-full rounded-lg bg-black" preload="metadata" />
      ) : (
        <p className="text-sm text-[#9fb2c8]">
          {preview ? 'Loading preview…' : 'No preview render yet — it appears here once QA passes.'}
        </p>
      )}
    </div>
  );
}
