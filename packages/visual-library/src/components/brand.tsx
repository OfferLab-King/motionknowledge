import {useCurrentFrame, interpolate} from 'remotion';
import type {Theme} from '../theme';

/**
 * Subtle brand mark in the bottom-right corner. Frame-driven and
 * deterministic; only renders when a brand name is present.
 */
export function BrandWatermark(props: {theme: Theme; brandName: string}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [10, 26], [0, 0.55], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        right: 28,
        bottom: 22,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity,
        fontSize: 22,
        fontWeight: 700,
        color: props.theme.colors.text,
        fontFamily: props.theme.fonts.heading,
        letterSpacing: 1,
      }}
    >
      <span style={{color: props.theme.colors.primary}}>▶</span>
      {props.brandName}
    </div>
  );
}
