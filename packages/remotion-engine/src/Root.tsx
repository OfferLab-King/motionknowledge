import {Composition} from 'remotion';
import {ProjectComposition} from './ProjectComposition';
import {StyleShowcase} from '@motionknowledge/visual-library/showcase';
import {SHOWCASE_DURATION_IN_FRAMES, SHOWCASE_FPS} from '@motionknowledge/visual-library/showcase';
import type {RenderManifest} from '@motionknowledge/schemas';
import {RenderManifestV1} from '@motionknowledge/schemas';

export function RemotionRoot(props: {manifest?: RenderManifest | null}) {
  return (
    <>
      <Composition
        id="ProjectComposition"
        component={ProjectComposition}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={async ({props}) => {
          if (!props.manifest) return {};
          const manifest = RenderManifestV1.parse(props.manifest);
          return {
            durationInFrames: manifest.totalDurationInFrames,
            width: manifest.width,
            height: manifest.height,
            fps: manifest.fps,
          };
        }}
      />
      <Composition
        id="StyleShowcase"
        component={StyleShowcase}
        durationInFrames={SHOWCASE_DURATION_IN_FRAMES}
        fps={SHOWCASE_FPS}
        width={1280}
        height={720}
        defaultProps={{styleId: 'signature', aspectRatio: '16:9'}}
      />
    </>
  );
}
