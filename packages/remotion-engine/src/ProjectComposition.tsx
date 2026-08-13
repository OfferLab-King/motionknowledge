import {getVisualDefinition, professionalTheme} from '@motionknowledge/visual-library';
import {AbsoluteFill, Audio, Sequence} from 'remotion';
import type {RenderManifest, RenderScene} from '@motionknowledge/schemas';
import {useEffect, useMemo, useState} from 'react';

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

const TYPED_VISUALS: Record<string, string> = {
  'title-hero': 'title-hero',
  'cashflow-timeline': 'cashflow-timeline',
  formula: 'formula',
  comparison: 'comparison',
};

export function SceneRenderer(props: {scene: RenderScene; index: number}) {
  const {scene} = props;
  const definition = useMemo(() => {
    const visual = scene.visual as {type?: string; data?: unknown};
    if (!visual || typeof visual !== 'object') return undefined;
    if (visual.type === 'catalog') {
      const data = (visual.data ?? {}) as {visualId?: string};
      return data.visualId ? getVisualDefinition(data.visualId) : undefined;
    }
    const typedId = TYPED_VISUALS[visual.type ?? ''];
    return typedId ? getVisualDefinition(typedId) : undefined;
  }, [scene.visual]);

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
          theme={professionalTheme}
          durationInFrames={scene.durationInFrames}
        />
      );
    }
  }

  return (
    <AbsoluteFill style={{backgroundColor: professionalTheme.colors.background, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{color: professionalTheme.colors.text, fontSize: 56, fontWeight: 700, padding: 64, textAlign: 'center'}}>
        {scene.title}
      </div>
    </AbsoluteFill>
  );
}

export function ProjectComposition(props: ProjectCompositionProps) {
  const {manifest} = props;
  if (!manifest) {
    return (
      <AbsoluteFill style={{backgroundColor: professionalTheme.colors.background}}>
        <div style={{color: professionalTheme.colors.text, fontSize: 40, textAlign: 'center', marginTop: 80}}>
          No manifest provided
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: manifest.theme.background}}>
      {manifest.scenes.map((scene: RenderScene, index: number) => (
        <Sequence key={scene.sceneVersionId} from={scene.startFrame} durationInFrames={scene.durationInFrames} premountFor={30}>
          <SceneWithAudio audioUrl={scene.narrationAudioKey ? props.audioUrls?.[scene.narrationAudioKey] : undefined}>
            <SceneRenderer scene={scene} index={index} />
          </SceneWithAudio>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
