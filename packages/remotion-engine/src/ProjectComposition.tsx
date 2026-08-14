import {getVisualDefinition, resolveSceneTheme, resolveTheme, BurnedCaptions, type Theme} from '@motionknowledge/visual-library';
import {visualRouter} from '@motionknowledge/visual-router';
import {AbsoluteFill, Audio, Sequence} from 'remotion';
import type {RenderManifest, RenderScene} from '@motionknowledge/schemas';
import {useEffect, useMemo, useState} from 'react';
import {rootBackgroundStyle} from '@motionknowledge/visual-library';

/**
 * Fetches the narration for the browser player and exposes it as a blob: URL.
 * Remotion's Player requires audio sources it can register; fetching with
 * same-origin credentials sidesteps cookie/cross-origin issues (e.g. when the
 * page is served on 127.0.0.1 but URLs carry localhost) and guarantees the
 * media is playable. The worker render path never mounts audio (narration is
 * mixed in post-production), so this only runs inside the Player.
 */
function useAudioObjectUrl(src: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    if (!src) {
      setUrl(undefined);
      return;
    }
    fetch(src, {credentials: 'same-origin'})
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(`audio fetch failed: ${response.status}`))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(undefined);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url;
}

function SceneWithAudio(props: {audioUrl: string | undefined; children: React.ReactNode}) {
  const audioSrc = useAudioObjectUrl(props.audioUrl);
  if (!audioSrc) return <>{props.children}</>;
  return (
    <>
      <Audio src={audioSrc} />
      {props.children}
    </>
  );
}

export interface ProjectCompositionProps {
  manifest?: RenderManifest | null;
  audioUrls?: Record<string, string>;
}

/**
 * Resolve the effective theme for one scene: manifest tokens (project style)
 * merged with the scene's own overrides, and the component variant selected
 * by the router. Browser Player and worker renders share this exact
 * interpretation.
 */
export function resolveSceneRender(
  manifest: RenderManifest,
  scene: RenderScene,
): {theme: Theme; componentId: string | null; variant: string | null} {
  const visual = scene.visual as {type?: string; data?: {visualId?: string}} | undefined;
  const componentId = visual && visual.type === 'catalog' ? (visual.data?.visualId ?? null) : null;
  const decision = visualRouter.route(
    {
      schemaVersion: 1,
      id: scene.sceneId,
      sceneVersionId: scene.sceneVersionId,
      index: scene.index,
      title: scene.title,
      narration: '',
      durationSeconds: Math.round(scene.durationInFrames / scene.fps),
      claimIds: [],
      chapterId: '',
      visual: scene.visual as never,
      provider: {provider: 'remotion', model: 'manifest', costUsd: '0', durationMs: 0},
      inputHash: scene.inputHash,
      styleOverride: scene.styleOverride ?? {},
    } as never,
    {
      durationSeconds: Math.round(scene.durationInFrames / scene.fps),
      hasApprovedAssets: false,
      hasLicensedAssets: false,
      language: 'en',
      styleId: manifest.style?.styleId ?? 'signature',
    },
  );
  const theme = resolveSceneTheme(manifest.theme as Theme, scene.styleOverride ?? undefined, decision.componentId ?? componentId ?? undefined);
  return {theme, componentId: decision.engine === 'remotion' ? decision.componentId : null, variant: decision.variant};
}

export function SceneRenderer(props: {scene: RenderScene; index: number; manifest: RenderManifest}) {
  const {scene, manifest} = props;
  const resolved = useMemo(() => resolveSceneRender(manifest, scene), [manifest, scene]);
  const definition = resolved.componentId ? getVisualDefinition(resolved.componentId) : undefined;

  if (definition) {
    const Component = definition.component;
    const visual = scene.visual as {type?: string; data?: unknown};
    const raw = (visual.data ?? {}) as {data?: unknown};
    const componentData = raw.data ?? visual.data;
    const parsed = definition.propsSchema.safeParse(componentData);
    if (parsed.success) {
      return (
        <Component
          data={parsed.data}
          theme={resolved.theme}
          durationInFrames={scene.durationInFrames}
        />
      );
    }
  }

  return (
    <AbsoluteFill style={{...rootBackgroundStyle(resolved.theme), justifyContent: 'center', alignItems: 'center'}}>
      <div style={{color: resolved.theme.colors.text, fontSize: 56, fontWeight: 700, padding: 64, textAlign: 'center', fontFamily: resolved.theme.fonts.heading}}>
        {scene.title}
      </div>
    </AbsoluteFill>
  );
}

export function ProjectComposition(props: ProjectCompositionProps) {
  const {manifest} = props;
  if (!manifest) {
    const theme = resolveTheme('signature');
    return (
      <AbsoluteFill style={rootBackgroundStyle(theme)}>
        <div style={{color: theme.colors.text, fontSize: 40, textAlign: 'center', marginTop: 80}}>
          No manifest provided
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={rootBackgroundStyle(manifest.theme as Theme)}>
      {manifest.scenes.map((scene: RenderScene, index: number) => (
        <Sequence key={scene.sceneVersionId} from={scene.startFrame} durationInFrames={scene.durationInFrames} premountFor={30}>
          <SceneWithAudio audioUrl={scene.narrationAudioKey ? props.audioUrls?.[scene.narrationAudioKey] : undefined}>
            <SceneRenderer scene={scene} index={index} manifest={manifest} />
            {manifest.burnedCaptions && scene.captionSegments.length > 0 ? (
              <BurnedCaptions
                theme={resolveSceneTheme(manifest.theme as Theme, scene.styleOverride ?? undefined, undefined)}
                segments={scene.captionSegments}
              />
            ) : null}
          </SceneWithAudio>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
