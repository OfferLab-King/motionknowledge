'use client';

import {Player} from '@remotion/player';
import {StyleShowcase, SHOWCASE_DURATION_IN_FRAMES, SHOWCASE_FPS} from '@motionknowledge/remotion-engine/browser';

/**
 * Deterministic animated style preview: the same miniature explanation in one
 * style, looped. Used in the project-creation gallery, template gallery and
 * settings. No AI involved.
 */
export function StylePreview(props: {
  styleId: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  className?: string;
}) {
  const width = props.width ?? 320;
  const height = props.height ?? 180;
  return (
    <div className={props.className} style={{width, height, overflow: 'hidden', borderRadius: 10, background: '#08111F'}}>
      <Player
        component={StyleShowcase}
        inputProps={{styleId: props.styleId, aspectRatio: '16:9'}}
        durationInFrames={SHOWCASE_DURATION_IN_FRAMES}
        fps={SHOWCASE_FPS}
        compositionWidth={1280}
        compositionHeight={720}
        style={{width, height}}
        loop
        controls={false}
        autoPlay={props.autoplay ?? false}
      />
    </div>
  );
}
