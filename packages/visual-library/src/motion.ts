import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export function useReveal(input: {
  startFrame?: number;
  durationFrames?: number;
  type?: 'fade' | 'slide-up' | 'scale';
}): {opacity: number; translateY: number; scale: number} {
  const frame = useCurrentFrame();
  const start = input.startFrame ?? 0;
  const duration = input.durationFrames ?? 18;
  const type = input.type ?? 'fade';
  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = type === 'scale' ? interpolate(progress, [0, 0.6, 1], [0, 1, 1]) : progress;
  const translateY = type === 'slide-up' ? interpolate(progress, [0, 1], [24, 0]) : 0;
  const scale = type === 'scale' ? interpolate(progress, [0, 1], [0.92, 1]) : 1;
  return {opacity, translateY, scale};
}

export function useSequencedReveal(index: number, stepFrames = 10): {
  opacity: number;
  translateY: number;
} {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = index * stepFrames;
  const s = spring({frame: frame - start, fps, config: {damping: 200, stiffness: 200}});
  return {
    opacity: interpolate(frame, [start, start + 8], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    translateY: interpolate(s, [0, 1], [16, 0]),
  };
}

export function useProgress(startFrame: number, durationFrames: number): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function useEasing(startFrame: number, durationFrames: number): number {
  const frame = useCurrentFrame();
  const p = useProgress(startFrame, durationFrames);
  return interpolate(p, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
