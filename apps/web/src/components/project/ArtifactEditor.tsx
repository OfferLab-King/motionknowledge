'use client';

import {useState} from 'react';
import {Button, Card, StatusPill} from '@motionknowledge/ui';

export interface ArtifactData {
  key: string;
  label: string;
  status: string | null;
  version: string | null;
  provider: string | null;
  costUsd: string | null;
  json: string | null;
}

export interface ArtifactVersionView {
  versionId: string;
  isActive: boolean;
  createdAt: string;
  provider: string | null;
  preview: string;
}

const KEY_TO_TYPE: Record<string, string> = {
  outline: 'lesson-plan',
  script: 'script',
  storyboard: 'storyboard',
};

export function ArtifactEditor({artifact, projectId}: {artifact: ArtifactData; projectId: string}) {
  const [draft, setDraft] = useState(artifact.json ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<ArtifactVersionView[] | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const dirty = draft !== artifact.json;
  const artifactType = KEY_TO_TYPE[artifact.key];

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(draft);
      } catch {
        setError('Invalid JSON — fix the syntax before saving.');
        return;
      }
      const response = await fetch(`/api/projects/${projectId}/artifacts/${artifactType}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({payload}),
      });
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setSaved(true);
      setVersions(null);
    } finally {
      setSaving(false);
    }
  }

  async function loadVersions() {
    const response = await fetch(`/api/projects/${projectId}/artifacts/${artifactType}`, {cache: 'no-store'});
    if (response.ok) {
      const data = (await response.json()) as {versions: ArtifactVersionView[]};
      setVersions(data.versions);
    }
  }

  async function restore(versionId: string) {
    setError(null);
    setRestoreDone(false);
    const response = await fetch(`/api/projects/${projectId}/artifacts/${artifactType}/restore`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({versionId}),
    });
    const data = (await response.json()) as {error?: string};
    if (!response.ok) {
      setError(data.error ?? 'Restore failed');
      return;
    }
    setRestoreDone(true);
    setVersions(null);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#f8fafc]">{artifact.label}</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#9fb2c8]">
            {artifact.version ? <span>Version {artifact.version}</span> : null}
            {artifact.provider ? <span>Provider: {artifact.provider}</span> : null}
            {artifact.costUsd && artifact.costUsd !== '0' ? <span>Est. cost: ${artifact.costUsd}</span> : null}
            {artifact.status ? <StatusPill status={artifact.status} /> : null}
          </div>
        </div>
      </div>
      {artifact.json ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[#9fb2c8]">
            Edit the structured artifact below. Saving validates it against the schema and claim provenance,
            promotes a new version, and regenerates the downstream stages.
          </p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Artifact JSON"
            spellCheck={false}
            rows={24}
            className="w-full rounded-lg border border-[#2a4568] bg-[#0a1526] p-4 font-mono text-xs leading-relaxed text-[#9fb2c8] outline-none focus:border-[#59d5e0]"
          />
          {error ? <p className="text-xs text-[#fb7185]">{error}</p> : null}
          {saved ? <p className="text-xs text-[#4ade80]">Saved — a new version was promoted and downstream jobs were enqueued.</p> : null}
          {restoreDone ? <p className="text-xs text-[#4ade80]">Restored — the active version was replaced and downstream jobs were enqueued.</p> : null}
          <div className="flex gap-2">
            <Button type="button" disabled={saving || !dirty} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save & regenerate downstream'}
            </Button>
            {dirty ? (
              <Button type="button" variant="secondary" onClick={() => setDraft(artifact.json ?? '')}>
                Discard changes
              </Button>
            ) : null}
          </div>
          <div className="border-t border-[#2a4568] pt-3">
            <button
              type="button"
              onClick={() => {
                setVersionsOpen((open) => !open);
                if (!versions) void loadVersions();
              }}
              className="text-xs font-semibold uppercase tracking-wide text-[#59d5e0] hover:underline"
            >
              Version history {versionsOpen ? '▾' : '▸'}
            </button>
            {versionsOpen ? (
              <div className="mt-2 flex max-h-64 flex-col gap-1 overflow-auto">
                {versions?.length ? (
                  versions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <div key={version.versionId} className="flex items-center justify-between gap-2 rounded bg-[#0f1c30] px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-xs text-[#f8fafc]">
                            {new Date(version.createdAt).toLocaleString()} · {version.provider ?? 'local'}
                          </div>
                          <div className="truncate text-[10px] text-[#9fb2c8]">{version.preview}</div>
                        </div>
                        {version.isActive ? (
                          <span className="shrink-0 text-[10px] text-[#4ade80]">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void restore(version.versionId)}
                            className="shrink-0 rounded bg-[#10213a] px-2 py-0.5 text-[10px] text-[#59d5e0] hover:bg-[#1a3050]"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-[#9fb2c8]">No versions yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#9fb2c8]">
          Not generated yet. The worker will produce this stage after the previous stage is approved.
        </p>
      )}
    </Card>
  );
}
