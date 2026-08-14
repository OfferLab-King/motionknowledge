'use client';

import {useEffect, useState} from 'react';
import {Field, TextInput, Button} from '@motionknowledge/ui';
import type {Scene, StyleOverride, VisualInstruction} from '@motionknowledge/schemas';
import {listStyles} from '@motionknowledge/visual-library/style';
import {visualRegistry, getVisualDefinition} from '@motionknowledge/visual-library';
import {migrateVisualForScene} from '@motionknowledge/visual-router';

const styles = listStyles();

const VISUAL_GROUPS: ReadonlyArray<{group: string; items: Array<{id: string; intent: string}>}> = [
  {group: 'Typography', items: []},
  {group: 'Explanation', items: []},
  {group: 'Quantitative', items: []},
  {group: 'Technical', items: []},
  {group: 'Relationships', items: []},
  {group: 'Assessment', items: []},
  {group: 'Specialist', items: [{id: '__hyperframes__', intent: 'Sandboxed HTML animation (HyperFrames)'}]},
];

for (const group of VISUAL_GROUPS) {
  if (group.group === 'Specialist') continue;
  for (const [id, definition] of Object.entries(visualRegistry)) {
    const groupName = definition.group[0]!.toUpperCase() + definition.group.slice(1);
    if (groupName !== group.group) continue;
    group.items.push({id, intent: definition.intent});
  }
}

function currentVisualId(scene: Scene): string {
  const visual = scene.visual as {type?: string; data?: {visualId?: string}};
  if (visual.type === 'hyperframes') return '__hyperframes__';
  if (visual.type === 'catalog') return visual.data?.visualId ?? 'catalog';
  return visual.type ?? 'catalog';
}

export interface SceneVersionInfo {
  versionId: string;
  title: string;
  narrationPreview: string;
  versionNumber: string;
  isActive: boolean;
  createdAt: string;
}

export function SceneProperties(props: {
  scene: Scene;
  projectStyleId?: string;
  onRegenerate: (patch: {title?: string; narration?: string; durationSeconds?: number}) => Promise<void>;
  onEdit: (patch: {title?: string; narration?: string; durationSeconds?: number; styleOverride?: Partial<StyleOverride>; visual?: {visualId: string}}) => Promise<void>;
  onRegenerateNarration: () => Promise<void>;
  onRestoreVersion: (versionId: string) => Promise<void>;
  busy: boolean;
  projectId: string;
}) {
  const {scene} = props;
  const override = scene.styleOverride ?? {};
  const [title, setTitle] = useState(scene.title);
  const [narration, setNarration] = useState(scene.narration);
  const [duration, setDuration] = useState(String(Math.round(scene.durationSeconds)));
  const [styleId, setStyleId] = useState(override.styleId ?? '');
  const [background, setBackground] = useState<string>(override.background ?? 'auto');
  const [motionIntensity, setMotionIntensity] = useState<string>(override.motionIntensity ?? 'auto');
  const [visualId, setVisualId] = useState(currentVisualId(scene));
  const [variant, setVariant] = useState(override.variant ?? '');
  const [saved, setSaved] = useState(false);
  const [versions, setVersions] = useState<SceneVersionInfo[] | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [narrationBusy, setNarrationBusy] = useState(false);
  const [narrationDone, setNarrationDone] = useState(false);

  const visualIdForScene = currentVisualId(scene);
  useEffect(() => {
    setVisualId(visualIdForScene);
  }, [visualIdForScene]);

  const definition = getVisualDefinition(visualId);
  const supportedVariants = definition?.variants ?? [];

  const currentPatch = () => ({
    title: title !== scene.title ? title : undefined,
    narration: narration !== scene.narration ? narration : undefined,
    durationSeconds: Number(duration) !== Math.round(scene.durationSeconds) ? Number(duration) : undefined,
  });

  const styleOverridePatch = () => {
    const patch: Partial<StyleOverride> = {};
    const base = scene.styleOverride ?? {};
    if (styleId !== (base.styleId ?? '')) patch.styleId = styleId || undefined;
    if (background !== (base.background ?? 'auto')) patch.background = background === 'auto' ? undefined : (background as StyleOverride['background']);
    if (motionIntensity !== (base.motionIntensity ?? 'auto')) {
      patch.motionIntensity = motionIntensity === 'auto' ? undefined : (motionIntensity as StyleOverride['motionIntensity']);
    }
    if (variant !== (base.variant ?? '')) patch.variant = variant || undefined;
    return patch;
  };

  const save = () => {
    setSaved(false);
    const patch: {title?: string; narration?: string; durationSeconds?: number; styleOverride?: Partial<StyleOverride>; visual?: {visualId: string; data?: unknown}} = {
      ...currentPatch(),
      styleOverride: styleOverridePatch(),
    };
    if (visualId !== currentVisualId(scene)) {
      if (visualId === '__hyperframes__') {
        patch.visual = {visualId: '__hyperframes__'};
      } else {
        const switched = migrateVisualForScene(scene.visual as VisualInstruction, visualId);
        patch.visual = {visualId: switched.visualId, data: switched.data};
      }
    }
    void props.onEdit(patch).then(() => setSaved(true));
  };
  async function loadVersions() {
    const response = await fetch(`/api/projects/${props.projectId}/scenes/${scene.id}/versions`, {cache: 'no-store'});
    if (response.ok) {
      const data = (await response.json()) as {versions: SceneVersionInfo[]};
      setVersions(data.versions);
    }
  }

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
      <div className="border-t border-[#2a4568] pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Visual</h3>
        <div className="flex flex-col gap-3">
          <Field label="Component" hint="Semantic component; compatible scene data is kept.">
            <select
              value={visualId}
              onChange={(event) => setVisualId(event.target.value)}
              aria-label="Visual component"
              className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
            >
              {VISUAL_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          {supportedVariants.length > 0 ? (
            <Field label="Component variant" hint="Only visuals that declare variants are overridable.">
              <select
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
                aria-label="Component variant"
                className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
              >
                <option value="">Style default</option>
                {supportedVariants.map((variantName) => (
                  <option key={variantName} value={variantName}>
                    {variantName}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </div>
      <div className="border-t border-[#2a4568] pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9fb2c8]">Scene visual override</h3>
        <div className="flex flex-col gap-3">
          <Field label="Visual style">
            <select
              value={styleId}
              onChange={(event) => setStyleId(event.target.value)}
              aria-label="Scene visual style"
              className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
            >
              <option value="">Project style ({props.projectStyleId ?? 'signature'})</option>
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Background">
            <select
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              aria-label="Scene background"
              className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
            >
              <option value="auto">Style default</option>
              <option value="flat">Flat</option>
              <option value="gradient">Gradient</option>
              <option value="paper">Paper</option>
              <option value="grid">Grid</option>
            </select>
          </Field>
          <Field label="Motion intensity">
            <select
              value={motionIntensity}
              onChange={(event) => setMotionIntensity(event.target.value)}
              aria-label="Motion intensity"
              className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
            >
              <option value="auto">Style default</option>
              <option value="subtle">Subtle</option>
              <option value="standard">Standard</option>
              <option value="expressive">Expressive</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="text-xs text-[#9fb2c8]">
        Visual: {currentVisualId(scene)} · v{scene.sceneVersionId.match(/-v(\d+)$/)?.[1] ?? 1}
      </div>
      {saved ? <div className="text-xs text-[#4ade80]">Saved — the preview reflects the change.</div> : null}
      {narrationDone ? <div className="text-xs text-[#4ade80]">Narration job enqueued.</div> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={props.busy} onClick={save}>
          Save edits
        </Button>
        <Button type="button" disabled={props.busy} onClick={() => void props.onRegenerate(currentPatch())}>
          Regenerate scene
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={props.busy || narrationBusy}
          onClick={() => {
            setNarrationBusy(true);
            setNarrationDone(false);
            void props
              .onRegenerateNarration()
              .then(() => setNarrationDone(true))
              .finally(() => setNarrationBusy(false));
          }}
        >
          {narrationBusy ? 'Enqueuing…' : 'Regenerate narration'}
        </Button>
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
                        v{version.versionNumber} · {version.title}
                      </div>
                      <div className="truncate text-[10px] text-[#9fb2c8]">{version.narrationPreview}</div>
                    </div>
                    {version.isActive ? (
                      <span className="text-[10px] text-[#4ade80]">Active</span>
                    ) : (
                      <button
                        type="button"
                        disabled={props.busy}
                        onClick={() => void props.onRestoreVersion(version.versionId)}
                        className="rounded bg-[#10213a] px-2 py-0.5 text-[10px] text-[#59d5e0] hover:bg-[#1a3050]"
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
  );
}
