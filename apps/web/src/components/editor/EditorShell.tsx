'use client';

import {useEffect, useMemo, useState} from 'react';
import {SceneList, type SceneListItem} from './SceneList';
import {Preview} from './Preview';
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

  const selectedScene = scenes.find((item) => item.scene.id === selectedSceneId)?.scene ?? scenes[0]?.scene ?? null;

  async function refresh() {
    const response = await fetch(`/api/projects/${projectId}/editor`, {cache: 'no-store'});
    if (response.ok) {
      const data = (await response.json()) as {scenes: SceneListItem[]; manifest: EditorManifest | null};
      setScenes(data.scenes);
      setManifest(data.manifest);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function regenerate(patch: {title?: string; narration?: string; durationSeconds?: number}) {
    if (!selectedScene) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}/regenerate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function editScene(patch: {title?: string; narration?: string; durationSeconds?: number}) {
    if (!selectedScene) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/scenes/${selectedScene.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const key = selectedScene?.sceneVersionId ?? 'none';

  return (
    <div className="grid grid-cols-[280px_1fr_360px] gap-4">
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Scenes</h2>
        <SceneList
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          onSelect={setSelectedSceneId}
        />
      </div>
      <div>
        <Preview manifest={manifest} />
      </div>
      <div className="rounded-lg border border-[#2a4568] bg-[#0f1c30]">
        <h2 className="border-b border-[#2a4568] p-3 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">
          Scene properties
        </h2>
        {selectedScene ? (
          <SceneProperties
            key={key}
            scene={selectedScene}
            onRegenerate={regenerate}
            onEdit={editScene}
            busy={busy}
          />
        ) : (
          <p className="p-4 text-sm text-[#9fb2c8]">No scene selected.</p>
        )}
      </div>
    </div>
  );
}
