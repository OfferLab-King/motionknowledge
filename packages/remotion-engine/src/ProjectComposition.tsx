import {getVisualDefinition, professionalTheme, type VisualComponentProps} from '@motionknowledge/visual-library';
import {AbsoluteFill, Audio, Sequence} from 'remotion';
import type {RenderManifest, RenderScene} from '@motionknowledge/schemas';
import {useMemo} from 'react';

export interface ProjectCompositionProps {
  manifest?: RenderManifest | null;
  audioUrls?: Record<string, string>;
}

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
    const visual = scene.visual as {type?: string; data?: unknown};
    const raw = (visual.data ?? {}) as {data?: unknown};
    const componentData = raw.data ?? visual.data;
    return (
      <Component
        data={componentData}
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
          {scene.narrationAudioKey && props.audioUrls?.[scene.narrationAudioKey] ? (
            <Audio src={props.audioUrls[scene.narrationAudioKey]} />
          ) : null}
          <SceneRenderer scene={scene} index={index} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
