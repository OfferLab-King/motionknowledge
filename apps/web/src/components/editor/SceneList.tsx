'use client';

import {DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {Scene} from '@motionknowledge/schemas';

export interface SceneListItem {
  scene: Scene;
  versionNumber: number;
  status: string;
}

function SortableRow(props: {
  item: SceneListItem;
  index: number;
  total: number;
  selected: boolean;
  busy: boolean;
  onSelect: (sceneId: string) => void;
  onMove: (sceneId: string, direction: -1 | 1) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
}) {
  const {item, index} = props;
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: item.scene.id});
  const ready = item.status === 'SUCCEEDED';
  const first = index === 0;
  const last = index === props.total - 1;
  return (
    <div
      ref={setNodeRef}
      style={{transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.85 : 1}}
      data-testid={`scene-${item.scene.id}`}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${props.selected ? 'bg-[#1a3050]' : 'hover:bg-[#0f1c30]'}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag scene"
        disabled={props.busy || props.total <= 1}
        className="cursor-grab rounded px-1 text-xs text-[#64748b] hover:text-[#59d5e0] disabled:opacity-30"
      >
        ⠿
      </button>
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
          disabled={props.busy || props.total <= 1}
          aria-label="Delete scene"
          onClick={() => props.onDelete(item.scene.id)}
          className="rounded px-1 text-xs text-[#9fb2c8] hover:text-[#fb7185] disabled:opacity-30"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function SceneList(props: {
  scenes: SceneListItem[];
  selectedSceneId: string;
  onSelect: (sceneId: string) => void;
  onMove: (sceneId: string, direction: -1 | 1) => void;
  onReorder: (activeId: string, overId: string) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  busy: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}));

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      props.onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={props.scenes.map((item) => item.scene.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {props.scenes.map((item, index) => (
            <SortableRow
              key={item.scene.id}
              item={item}
              index={index}
              total={props.scenes.length}
              selected={item.scene.id === props.selectedSceneId}
              busy={props.busy}
              onSelect={props.onSelect}
              onMove={props.onMove}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
