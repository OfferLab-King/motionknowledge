import {getVisualDefinition, professionalTheme, type VisualComponentProps} from '@motionknowledge/visual-library';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import type {RenderManifest, RenderScene} from '@motionknowledge/schemas';
import {useMemo} from 'react';

export function SceneRenderer(props: {scene: RenderScene; index: number}) {
  const {scene} = props;
  const definition = useMemo(() => {
    const visual = scene.visual as {type?: string; data?: unknown};
    if (!visual || typeof visual !== 'object') return undefined;
    if (visual.type === 'catalog') {
      const data = (visual.data ?? {}) as {visualId?: string};
      return data.visualId ? getVisualDefinition(data.visualId) : undefined;
    }
    return undefined;
  }, [scene.visual]);

  if (definition) {
    const Component = definition.component;
    const visual = scene.visual as {data?: unknown};
    return (
      <Component
        data={visual.data}
        theme={professionalTheme}
        durationInFrames={scene.durationInFrames}
      />
    );
  }

  return (
    <AbsoluteFill style={{backgroundColor: professionalTheme.colors.background, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{color: professionalTheme.colors.text, fontSize: 56, fontWeight: 700, padding: 64, textAlign: 'center'}}>
        {scene.title}
      </div>
    </AbsoluteFill>
  );
}

export function ProjectComposition(props: {manifest?: RenderManifest | null}) {
  const {manifest} = props;
  const {fps} = useVideoConfig();
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
          <SceneRenderer scene={scene} index={index} />
        </Sequence>
      ))}
      {manifest.audioTracks.map((track) => (
        <Sequence key={track.sceneVersionId} from={Math.round((track.offsetMs / 1000) * fps)} durationInFrames={manifest.totalDurationInFrames}>
          <></>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
