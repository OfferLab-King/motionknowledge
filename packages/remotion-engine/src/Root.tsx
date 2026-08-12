import {Composition} from 'remotion';
import {ProjectComposition} from './ProjectComposition';
import type {RenderManifest} from '@motionknowledge/schemas';
import {RenderManifestV1} from '@motionknowledge/schemas';

export function RemotionRoot(props: {manifest?: RenderManifest | null}) {
  return (
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
  );
}
