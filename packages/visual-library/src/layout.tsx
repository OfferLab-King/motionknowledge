import {AbsoluteFill} from 'remotion';
import type {CSSProperties, ReactNode} from 'react';
import type {Theme} from './theme';
import {surfaceStyle} from './styling';
import {HandUnderline, useDrawProgress} from './components/variants';
import {useCurrentFrame} from 'remotion';

export function SafeArea(props: {
  theme: Theme;
  children: ReactNode;
  style?: CSSProperties;
  center?: boolean;
}) {
  return (
    <AbsoluteFill
      style={{
        paddingTop: props.theme.safeAreaY,
        paddingBottom: props.theme.safeAreaY,
        paddingLeft: props.theme.safeAreaX,
        paddingRight: props.theme.safeAreaX,
        justifyContent: props.center ? 'center' : 'flex-start',
        alignItems: props.center ? 'center' : 'stretch',
        ...props.style,
      }}
    >
      {props.children}
    </AbsoluteFill>
  );
}

export function Panel(props: {theme: Theme; children: ReactNode; style?: CSSProperties; seed?: number}) {
  const theme = props.theme;
  const jitter = theme.visualLanguage === 'hand-drawn' ? (props.seed ?? 0) % 2 === 0 ? -0.6 : 0.5 : 0;
  const handDrawnBorder =
    theme.visualLanguage === 'hand-drawn'
      ? {border: 'none', outline: 'none', boxShadow: `0 1px 0 rgba(46,42,36,0.06), 2px 2px 0 ${theme.surfaces.borderColor}, -1px -1px 0 ${theme.surfaces.borderColor}`}
      : {};
  return (
    <div
      style={{
        ...surfaceStyle(theme, {padding: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, ...props.style}),
        ...handDrawnBorder,
        transform: jitter !== 0 ? `rotate(${jitter}deg)` : undefined,
      }}
    >
      {props.children}
    </div>
  );
}

export function clampLines(text: string, maxLines: number, maxChars = 56): string[] {
  const raw = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of raw) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export function TruncatedText(props: {
  text: string;
  theme: Theme;
  maxLines?: number;
  style?: CSSProperties;
}) {
  const lines = clampLines(props.text, props.maxLines ?? 3);
  const overflow = clampLines(props.text, 999).length > lines.length;
  return (
    <div
      style={{
        color: props.theme.colors.text,
        fontSize: props.theme.typography.body,
        lineHeight: 1.35,
        fontFamily: props.theme.fonts.body,
        ...props.style,
      }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {overflow ? (
        <div style={{color: props.theme.colors.muted, fontSize: props.theme.typography.caption, marginTop: 6}}>…</div>
      ) : null}
    </div>
  );
}

export function Kicker(props: {text: string; theme: Theme}) {
  const theme = props.theme;
  if (theme.visualLanguage === 'hand-drawn') {
    const progress = useDrawProgress(8, 22);
    const frame = useCurrentFrame();
    void frame;
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div
          style={{
            color: theme.colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontSize: theme.typography.caption,
            fontWeight: 700,
            fontFamily: theme.fonts.heading,
          }}
        >
          {props.text}
        </div>
        <HandUnderline theme={theme} width={Math.max(60, props.text.length * 15)} progress={progress} style={{marginTop: 4}} />
      </div>
    );
  }
  if (theme.visualLanguage === 'minimal') {
    return (
      <div
        style={{
          color: theme.colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 4,
          fontSize: theme.typography.caption,
          fontWeight: 600,
          fontFamily: theme.fonts.heading,
        }}
      >
        {props.text}
      </div>
    );
  }
  return (
    <div
      style={{
        color: theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontSize: theme.typography.caption,
        fontWeight: 600,
        fontFamily: theme.fonts.heading,
      }}
    >
      {props.text}
    </div>
  );
}
