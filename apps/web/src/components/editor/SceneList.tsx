'use client';

import type {Scene} from '@motionknowledge/schemas';

export interface SceneListItem {
  scene: Scene;
  versionNumber: number;
  status: string;
}

export function SceneList(props: {
  scenes: SceneListItem[];
  selectedSceneId: string;
  onSelect: (sceneId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {props.scenes.map((item) => {
        const selected = item.scene.id === props.selectedSceneId;
        const ready = item.status === 'SUCCEEDED';
        return (
          <button
            key={item.scene.id}
            type="button"
            onClick={() => props.onSelect(item.scene.id)}
            data-testid={`scene-${item.scene.id}`}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
              selected ? 'bg-[#1a3050]' : 'hover:bg-[#0f1c30]'
            }`}
          >
            <span className="text-sm text-[#f8fafc]">{item.scene.title}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-[#9fb2c8]">{Math.round(item.scene.durationSeconds)}s</span>
              <span
                data-testid={`${item.scene.id}-version`}
                className="rounded bg-[#10213a] px-1.5 py-0.5 text-xs text-[#59d5e0]"
              >
                v{item.versionNumber}
              </span>
              {ready ? (
                <span className="text-xs font-medium text-[#4ade80]">Scene ready</span>
              ) : (
                <span className="text-xs text-[#f7c948]">{item.status.toLowerCase()}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
