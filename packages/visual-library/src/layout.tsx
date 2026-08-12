import {AbsoluteFill} from 'remotion';
import type {CSSProperties, ReactNode} from 'react';
import type {Theme} from './theme';

export function SafeArea(props: {
  theme: Theme;
  children: ReactNode;
  style?: CSSProperties;
  center?: boolean;
}) {
  return (
    <AbsoluteFill
      style={{
        paddingTop: props.theme.safeArea.y,
        paddingBottom: props.theme.safeArea.y,
        paddingLeft: props.theme.safeArea.x,
        paddingRight: props.theme.safeArea.x,
        justifyContent: props.center ? 'center' : 'flex-start',
        alignItems: props.center ? 'center' : 'stretch',
        ...props.style,
      }}
    >
      {props.children}
    </AbsoluteFill>
  );
}

export function Panel(props: {theme: Theme; children: ReactNode; style?: CSSProperties}) {
  return (
    <div
      style={{
        background: props.theme.colors.surface,
        borderRadius: props.theme.radius.md,
        padding: props.theme.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: props.theme.spacing.sm,
        ...props.style,
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
        fontSize: 30,
        lineHeight: 1.35,
        fontFamily: 'sans-serif',
        ...props.style,
      }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {overflow ? (
        <div style={{color: props.theme.colors.muted, fontSize: 22, marginTop: 6}}>…</div>
      ) : null}
    </div>
  );
}

export function Kicker(props: {text: string; theme: Theme}) {
  return (
    <div
      style={{
        color: props.theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontSize: 20,
        fontWeight: 600,
      }}
    >
      {props.text}
    </div>
  );
}
