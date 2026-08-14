'use client';

import {useEffect, useMemo, useState} from 'react';
import {SceneList, type SceneListItem} from './SceneList';
import {Preview, type PreviewManifest} from './Preview';
import {SceneProperties} from './SceneProperties';
import type {RenderManifest, Scene} from '@motionknowledge/schemas';

export interface EditorManifest extends RenderManifest {
  audioUrls?: Record<string, string>;
}

export function EditorShell(props: {
  projectId: string;
  initialScenes: SceneListItem[];
  initialManifest: EditorManifest | null;
}) {
  const {projectId} = props;
  const [scenes, setScenes] = useState<SceneListItem[]>(props.initialScenes);
  const [manifest, setManifest] = useState<EditorManifest | null>(props.initialManifest);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(props.initialScenes[0]?.scene.id ?? '');
  const [busy, setBusy] = useState(false);
  const [showOverride, setShowOverride] = useState(true);

  const selectedScene = scenes.find((item) => item.scene.id === selectedSceneId)?.scene ?? scenes[0]?.scene ?? null;

  async function refresh() {
    const response = await fetch(`/api/projects/${projectId}/editor`, {cache: 'no-store'});
    if (response.ok) {
      const data = (await response.json()) as {scenes: SceneListItem[]; manifest: EditorManifest | null};
      setScenes(data.scenes);
      setManifest(data.manifest);
      if (!data.scenes.some((item) => item.scene.id === selectedSceneId)) {
        setSelectedSceneId(data.scenes[0]?.scene.id ?? '');
      }
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(patch: {title?: string; narration?: string; durationSeconds?: number}) {
    if (!selectedScene) return;
    await withBusy(async () => {
      await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}/regenerate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
    });
  }

  async function editScene(patch: {
    title?: string;
    narration?: string;
    durationSeconds?: number;
    styleOverride?: {styleId?: string; variant?: string; background?: string; motionIntensity?: string};
    visual?: {visualId: string};
  }) {
    if (!selectedScene) return;
    await withBusy(async () => {
      await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
    });
  }

  async function regenerateNarration() {
    if (!selectedScene) return;
    await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}/regenerate-narration`, {
      method: 'POST',
    });
  }

  async function restoreVersion(versionId: string) {
    if (!selectedScene) return;
    await withBusy(async () => {
      await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}/restore`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({versionId}),
      });
    });
  }

  async function moveScene(sceneId: string, direction: -1 | 1) {
    const ordered = scenes.map((item) => item.scene.id);
    const index = ordered.indexOf(sceneId);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[index], ordered[swap]] = [ordered[swap]!, ordered[index]!];
    await persistOrder(ordered);
  }

  async function reorderScene(activeId: string, overId: string) {
    const ordered = scenes.map((item) => item.scene.id);
    const from = ordered.indexOf(activeId);
    const to = ordered.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    ordered.splice(from, 1);
    ordered.splice(to, 0, activeId);
    await persistOrder(ordered);
  }

  async function persistOrder(ordered: string[]) {
    await withBusy(async () => {
      await fetch(`/api/projects/${projectId}/scenes/reorder`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({orderedSceneKeys: ordered}),
      });
    });
  }

  async function duplicateScene(sceneId: string) {
    await withBusy(async () => {
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}/duplicate`, {method: 'POST'});
      if (response.ok) {
        const data = (await response.json()) as {scene: Scene};
        setSelectedSceneId(data.scene.id);
      }
    });
  }

  async function deleteScene(sceneId: string) {
    await withBusy(async () => {
      await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {method: 'DELETE'});
    });
  }

  const key = selectedScene?.sceneVersionId ?? 'none';

  const previewManifest = useMemo<EditorManifest | null>(() => {
    if (!manifest || showOverride || !selectedSceneId) return manifest;
    // Preview the selected scene in the project style by stripping overrides.
    return {
      ...manifest,
      scenes: manifest.scenes.map((scene) =>
        scene.sceneId === selectedSceneId ? {...scene, styleOverride: {}} : scene,
      ),
    };
  }, [manifest, showOverride, selectedSceneId]);

  return (
    <div className="grid grid-cols-[300px_1fr_380px] gap-4">
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Scenes</h2>
        <SceneList
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          onSelect={setSelectedSceneId}
          onMove={moveScene}
          onReorder={reorderScene}
          onDuplicate={duplicateScene}
          onDelete={deleteScene}
          busy={busy}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Preview</h2>
          <label className="flex items-center gap-2 text-xs text-[#9fb2c8]">
            <input
              type="checkbox"
              checked={showOverride}
              onChange={(event) => setShowOverride(event.target.checked)}
              aria-label="Show scene overrides in preview"
            />
            Scene overrides
          </label>
        </div>
        <Preview manifest={previewManifest} />
        {!showOverride && selectedScene ? (
          <p className="mt-2 text-xs text-[#9fb2c8]">
            Previewing <span className="text-[#59d5e0]">{selectedScene.title}</span> with its style overrides
            ignored (project style only).
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30]">
        <h2 className="border-b border-[#2a4568] p-3 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">
          Scene properties
        </h2>
        {selectedScene ? (
          <SceneProperties
            key={key}
            scene={selectedScene}
            projectStyleId={manifest?.style?.styleId ?? 'signature'}
            projectId={projectId}
            onRegenerate={regenerate}
            onEdit={editScene}
            onRegenerateNarration={regenerateNarration}
            onRestoreVersion={restoreVersion}
            busy={busy}
          />
        ) : (
          <p className="p-4 text-sm text-[#9fb2c8]">No scene selected.</p>
        )}
      </div>
    </div>
  );
}
