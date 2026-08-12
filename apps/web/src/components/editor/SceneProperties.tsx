'use client';

import {useState} from 'react';
import {Field, TextInput, Button} from '@motionknowledge/ui';
import type {Scene} from '@motionknowledge/schemas';

export function SceneProperties(props: {
  scene: Scene;
  onRegenerate: (patch: {title?: string; narration?: string; durationSeconds?: number}) => Promise<void>;
  onEdit: (patch: {title?: string; narration?: string; durationSeconds?: number}) => Promise<void>;
  busy: boolean;
}) {
  const {scene} = props;
  const [title, setTitle] = useState(scene.title);
  const [narration, setNarration] = useState(scene.narration);
  const [duration, setDuration] = useState(String(Math.round(scene.durationSeconds)));

  const currentPatch = () => ({
    title: title !== scene.title ? title : undefined,
    narration: narration !== scene.narration ? narration : undefined,
    durationSeconds: Number(duration) !== Math.round(scene.durationSeconds) ? Number(duration) : undefined,
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <Field label="Scene title">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Scene title" />
      </Field>
      <Field label="Narration">
        <textarea
          value={narration}
          onChange={(event) => setNarration(event.target.value)}
          aria-label="Narration"
          rows={6}
          className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-[#f8fafc] outline-none focus:border-[#59d5e0]"
        />
      </Field>
      <Field label="Duration (seconds)">
        <TextInput
          type="number"
          min={3}
          max={600}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          aria-label="Duration (seconds)"
        />
      </Field>
      <div className="text-xs text-[#9fb2c8]">
        Visual: {(scene.visual as {type?: string}).type ?? 'catalog'} · v
        {scene.sceneVersionId.match(/-v(\d+)$/)?.[1] ?? 1}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={props.busy}
          onClick={() => void props.onEdit(currentPatch())}
        >
          Save edits
        </Button>
        <Button
          type="button"
          disabled={props.busy}
          onClick={() => void props.onRegenerate(currentPatch())}
        >
          Regenerate scene
        </Button>
      </div>
    </div>
  );
}
