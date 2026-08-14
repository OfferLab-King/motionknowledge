import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../theme';
import {useDrawProgress} from './variants';

export interface CaptionSegmentInput {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Burned captions, styled by the style's caption treatment tokens
 * (pill / marker / block / flat). Frame-driven and deterministic: the active
 * segment is derived purely from the scene-relative frame.
 */
export function BurnedCaptions(props: {
  theme: Theme;
  segments: CaptionSegmentInput[];
  maxLines?: number;
}) {
  const {theme, segments} = props;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const active = segments.find((segment) => segment.startMs <= currentMs && currentMs < segment.endMs);
  if (!active) return null;

  const treatment = theme.caption.treatment;
  const opacity = interpolate(frame, [0, 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const base: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: theme.safeAreaY / 2,
    transform: 'translateX(-50%)',
    maxWidth: '80%',
    textAlign: 'center',
    fontSize: theme.caption.size,
    fontWeight: theme.caption.weight,
    color: theme.caption.text,
    fontFamily: theme.fonts.body,
    lineHeight: 1.35,
    opacity,
    zIndex: 10,
  };

  let style: React.CSSProperties;
  switch (treatment) {
    case 'marker': {
      const draw = useDrawProgress(0, 8);
      style = {
        ...base,
        background: 'transparent',
        padding: '4px 14px',
        boxDecorationBreak: 'clone',
      };
      return (
        <div style={{position: 'absolute', left: '50%', bottom: theme.safeAreaY / 2, transform: 'translateX(-50%)', zIndex: 10, opacity}}>
          <div style={{position: 'relative', display: 'inline-block', maxWidth: '80vw'}}>
            <div
              style={{
                position: 'absolute',
                inset: '10% -8px -6% -8px',
                background: theme.caption.background,
                transform: 'skewX(-2deg)',
                transformOrigin: 'left center',
                scale: `${interpolate(draw, [0, 1], [0.15, 1]).toFixed(3)} 1`,
              }}
            />
            <span style={{...base, position: 'relative', bottom: 0, opacity: 1, maxWidth: '80vw'}}>{active.text}</span>
          </div>
        </div>
      );
    }
    case 'block':
      style = {
        ...base,
        background: theme.caption.background,
        padding: '10px 22px',
        borderRadius: 0,
      };
      break;
    case 'flat':
      style = {
        ...base,
        background: 'transparent',
        padding: '6px 12px',
        textShadow: '0 1px 3px rgba(0,0,0,0.35)',
      };
      break;
    default:
      style = {
        ...base,
        background: theme.caption.background,
        padding: '10px 22px',
        borderRadius: 999,
      };
  }

  return <div style={style}>{active.text}</div>;
}
