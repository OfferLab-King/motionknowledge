import type {CSSProperties, ReactNode} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import type {Theme} from './theme';
import {HandArrow} from './components/variants';

/** Root background style derived from the theme's background system. */
export function rootBackgroundStyle(theme: Theme): CSSProperties {
  const t = theme.background;
  const style: CSSProperties = {backgroundColor: theme.colors.background};
  if (t.treatment === 'gradient' && t.gradient !== 'none') {
    style.background = t.gradient;
  }
  if (t.treatment === 'paper') {
    style.background =
      'repeating-linear-gradient(0deg, rgba(46,42,36,0.03) 0px, rgba(46,42,36,0.03) 1px, transparent 1px, transparent 3px), ' +
      'repeating-linear-gradient(90deg, rgba(46,42,36,0.02) 0px, rgba(46,42,36,0.02) 1px, transparent 1px, transparent 3px), ' +
      theme.colors.background;
  }
  if (t.treatment === 'grid') {
    style.background =
      'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), ' +
      theme.colors.background;
    style.backgroundSize = '64px 64px';
  }
  if (t.treatment === 'texture' && t.texture !== 'none') {
    style.background = `${theme.colors.background} radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`;
    style.backgroundSize = '24px 24px, 24px 24px';
  }
  return style;
}

/** Card/surface treatment from the theme (border, shadow, radius, fill). */
export function surfaceStyle(theme: Theme, overrides?: CSSProperties): CSSProperties {
  return {
    background: theme.colors.surface,
    borderRadius: theme.radius.md,
    border: `${theme.surfaces.borderWidth}px ${theme.surfaces.borderStyle} ${theme.surfaces.borderColor}`,
    boxShadow: theme.surfaces.shadow,
    ...overrides,
  };
}

/** Connector between process steps; adapts to the visual language. */
export function FlowArrow(props: {
  theme: Theme;
  active: boolean;
  width?: number;
  seed?: number;
  startFrame?: number;
  progress?: number;
}) {
  const theme = props.theme;
  const width = props.width ?? 70;
  const frame = useCurrentFrame();
  const reveal = props.progress ?? interpolate(frame, [props.startFrame ?? 0, (props.startFrame ?? 0) + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = props.active ? 1 : 0.35;
  const color = theme.colors.primary;
  switch (theme.visualLanguage) {
    case 'hand-drawn':
      return (
        <div style={{position: 'relative', width, height: 24, opacity: opacity * reveal}}>
          <HandArrow theme={theme} seed={props.seed ?? 3} x1={6} y1={12} x2={width - 10} y2={12} color={color} progress={reveal} style={{position: 'absolute', left: 0, top: 0}} />
        </div>
      );
    case 'structured':
      return (
        <div style={{width, height: 14, opacity: opacity * reveal, display: 'flex', alignItems: 'center'}}>
          <div style={{flex: 1, height: 3, background: color}} />
          <div style={{width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: `12px solid ${color}`}} />
        </div>
      );
    case 'infographic':
      return (
        <div style={{width, height: 18, opacity: opacity * reveal, display: 'flex', alignItems: 'center', transform: `scaleX(${0.2 + reveal * 0.8})`, transformOrigin: 'left'}}>
          <div style={{flex: 1, height: 10, background: theme.colors.primary}} />
          <div style={{width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: `16px solid ${theme.colors.primary}`}} />
        </div>
      );
    case 'business':
      return (
        <div style={{position: 'relative', width, height: 2, background: color, opacity: opacity * reveal}}>
          <div style={{position: 'absolute', right: -4, top: -5, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid ${color}`}} />
        </div>
      );
    case 'minimal':
      return (
        <div style={{position: 'relative', width, height: 2, background: theme.colors.primary, opacity: opacity * reveal}}>
          <div style={{position: 'absolute', right: -4, top: -5, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid ${color}`}} />
        </div>
      );
    default:
      return (
        <div style={{width, height: 4, borderRadius: 2, opacity: opacity * reveal, transform: `scaleX(${0.3 + reveal * 0.7})`, transformOrigin: 'left', background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primaryAlt})`}} />
      );
  }
}

/** Bullet marker; adapts to the visual language. */
export function BulletDot(props: {theme: Theme; active?: boolean; size?: number; index?: number}) {
  const theme = props.theme;
  const size = props.size ?? 14;
  const active = props.active ?? true;
  const seed = props.index ?? 0;
  if (theme.visualLanguage === 'hand-drawn') {
    return (
      <svg width={size + 8} height={size + 8} viewBox={`0 0 ${size + 8} ${size + 8}`} style={{flexShrink: 0}}>
        <ellipse
          cx={(size + 8) / 2 + Math.sin(seed * 7.7) * 1.5}
          cy={(size + 8) / 2 + Math.cos(seed * 3.1) * 1.5}
          rx={size / 2}
          ry={size / 2.4}
          fill={active ? theme.colors.primary : 'none'}
          stroke={theme.colors.primary}
          strokeWidth={2.5}
          transform={`rotate(${seed % 2 === 0 ? -6 : 6} ${(size + 8) / 2} ${(size + 8) / 2})`}
        />
      </svg>
    );
  }
  if (theme.visualLanguage === 'minimal') {
    return <div style={{width: size, height: 2, background: theme.colors.primary, marginTop: size / 2 + 4, flexShrink: 0}} />;
  }
  if (theme.visualLanguage === 'infographic') {
    return <div style={{width: size + 6, height: size + 6, background: theme.colors.primary, flexShrink: 0, marginTop: 2}} />;
  }
  return <div style={{width: size, height: size, borderRadius: size / 2, background: theme.colors.primary, flexShrink: 0, marginTop: 2}} />;
}

/** A compact labelled value chip used for stats in business/editorial styles. */
export function StatChip(props: {theme: Theme; label: string; value: string; tone?: 'primary' | 'accent' | 'success'; style?: CSSProperties}) {
  const theme = props.theme;
  const tone = props.tone ?? 'primary';
  const color = tone === 'primary' ? theme.colors.primary : tone === 'success' ? theme.colors.success : theme.colors.accent;
  return (
    <div
      style={{
        ...surfaceStyle(theme),
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderLeft: `4px solid ${color}`,
        ...props.style,
      }}
    >
      <div style={{fontSize: theme.typography.caption, color: theme.colors.muted}}>{props.label}</div>
      <div style={{fontSize: theme.typography.heading, fontWeight: 800, color: props.theme.visualLanguage === 'hand-drawn' ? theme.colors.text : color, fontFamily: theme.fonts.heading}}>
        {props.value}
      </div>
    </div>
  );
}

export function SceneFrame(props: {theme: Theme; children: ReactNode; style?: CSSProperties}) {
  return (
    <div style={{position: 'absolute', inset: 0, ...rootBackgroundStyle(props.theme), ...props.style}}>{props.children}</div>
  );
}
