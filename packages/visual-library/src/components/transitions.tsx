import {interpolate, useCurrentFrame, AbsoluteFill} from 'remotion';
import type {ReactNode} from 'react';
import type {Theme} from '../theme';

/**
 * Deterministic scene transition driven by the style's transition tokens.
 * The incoming scene animates over the first `transitions.durationFrames`
 * frames; for a crossfade-through-background feel the scene fades in from the
 * theme background color.
 */
export function SceneTransition(props: {theme: Theme; children: ReactNode}) {
  const frame = useCurrentFrame();
  const theme = props.theme;
  const family = theme.transitions.family;
  const duration = theme.transitions.durationFrames;
  const p = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (value) => 1 - Math.pow(1 - value, 3),
  });

  let style: React.CSSProperties = {};
  if (family === 'slide') {
    style = {transform: `translateX(${interpolate(p, [0, 1], [48, 0])}px)`};
  } else if (family === 'scale') {
    style = {transform: `scale(${interpolate(p, [0, 1], [0.96, 1])})`};
  } else if (family === 'draw') {
    style = {clipPath: `inset(${interpolate(p, [0, 1], [100, 0])}% 0% 0% 0%)`};
  } else {
    style = {opacity: p};
  }
  // A translucent backdrop makes the fade read as a crossfade on any content.
  if (family === 'crossfade' || family === 'draw') {
    style = {
      ...style,
      backgroundColor: theme.colors.background,
    };
  }

  return (
    <AbsoluteFill style={style}>
      {props.children}
    </AbsoluteFill>
  );
}
