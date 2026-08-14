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
  onMove: (sceneId: string, direction: -1 | 1) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {props.scenes.map((item, index) => {
        const selected = item.scene.id === props.selectedSceneId;
        const ready = item.status === 'SUCCEEDED';
        const first = index === 0;
        const last = index === props.scenes.length - 1;
        return (
          <div
            key={item.scene.id}
            data-testid={`scene-${item.scene.id}`}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${selected ? 'bg-[#1a3050]' : 'hover:bg-[#0f1c30]'}`}
          >
            <button
              type="button"
              onClick={() => props.onSelect(item.scene.id)}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-left"
            >
              <span className="truncate text-sm text-[#f8fafc]">{item.scene.title}</span>
              <span className="flex shrink-0 items-center gap-2">
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
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={props.busy || first}
                aria-label="Move scene up"
                onClick={() => props.onMove(item.scene.id, -1)}
                className="rounded px-1 text-xs text-[#9fb2c8] hover:text-[#59d5e0] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={props.busy || last}
                aria-label="Move scene down"
                onClick={() => props.onMove(item.scene.id, 1)}
                className="rounded px-1 text-xs text-[#9fb2c8] hover:text-[#59d5e0] disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={props.busy}
                aria-label="Duplicate scene"
                onClick={() => props.onDuplicate(item.scene.id)}
                className="rounded px-1 text-xs text-[#9fb2c8] hover:text-[#59d5e0] disabled:opacity-30"
              >
                ⧉
              </button>
              <button
                type="button"
                disabled={props.busy || props.scenes.length <= 1}
                aria-label="Delete scene"
                onClick={() => props.onDelete(item.scene.id)}
                className="rounded px-1 text-xs text-[#9fb2c8] hover:text-[#fb7185] disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
