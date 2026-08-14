import {interpolate, useCurrentFrame} from 'remotion';
import type {Theme} from '../theme';

/**
 * Deterministic hand-drawn primitives. All wobble/offset values are pure
 * functions of a seed, so renders are reproducible frame-for-frame while
 * still feeling sketched by hand.
 */

function wobble(seed: number, t: number): number {
  return Math.sin(seed * 12.9898 + t * 1.31) * 1.6 + Math.sin(seed * 78.233 + t * 0.73) * 0.9;
}

export function sketchPerimeter(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
  wobblePoints = 8,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const perSide = wobblePoints;
  const corners: Array<[number, number]> = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  let n = 0;
  for (let side = 0; side < 4; side++) {
    const cornerA: [number, number] = corners[side] ?? [x, y];
    const cornerB: [number, number] = corners[(side + 1) % 4] ?? [x + width, y];
    const ax = cornerA[0];
    const ay = cornerA[1];
    const bx = cornerB[0];
    const by = cornerB[1];
    for (let i = 0; i < perSide; i++) {
      const t = i / perSide;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      points.push([px + wobble(seed, n * 0.9 + side * 5), py + wobble(seed + 3, n * 0.8 + side * 3)]);
      n++;
    }
  }
  points.push(corners[0]!);
  return points;
}

export function sketchPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
}

function pathLength(path: string): number {
  // Rough upper bound; the dash animation only needs a consistent length.
  return path.split(/[ML] /).length * 120;
}

export function useDrawProgress(startFrame: number, durationFrames: number): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** A sketched box whose border draws itself in. */
export function SketchBox(props: {
  theme: Theme;
  seed: number;
  width: number;
  height: number;
  x?: number;
  y?: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  startFrame?: number;
  durationFrames?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const progress = props.progress ?? useDrawProgress(props.startFrame ?? 0, props.durationFrames ?? 28);
  const {x = 0, y = 0, width, height} = props;
  const seed = props.seed;
  const color = props.color ?? props.theme.colors.primary;
  const strokeWidth = props.strokeWidth ?? props.theme.strokes.width;
  const points = sketchPerimeter(x, y, width, height, seed);
  const path = sketchPath(points);
  return (
    <svg width={width} height={height} style={{overflow: 'visible', ...props.style}}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength(path)}
        strokeDashoffset={pathLength(path) * (1 - progress)}
      />
      {props.children}
    </svg>
  );
}

/** A sketched circle whose outline draws itself in. */
export function SketchCircle(props: {
  theme: Theme;
  seed: number;
  size: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  startFrame?: number;
  durationFrames?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const progress = props.progress ?? useDrawProgress(props.startFrame ?? 0, props.durationFrames ?? 28);
  const seed = props.seed;
  const size = props.size;
  const color = props.color ?? props.theme.colors.primary;
  const rx = size / 2 + wobble(seed, 0) * 2;
  const ry = size / 2 + wobble(seed + 4, 1) * 2;
  const path = `M ${size / 2 - rx + wobble(seed, 2)} ${size / 2} A ${rx} ${ry} 0 1 1 ${size / 2 + rx - wobble(seed + 2, 3)} ${size / 2} A ${rx} ${ry} 0 1 1 ${size / 2 - rx + wobble(seed + 1, 4)} ${size / 2}`;
  return (
    <svg width={size} height={size} style={{overflow: 'visible', ...props.style}}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={props.strokeWidth ?? props.theme.strokes.width}
        strokeLinecap="round"
        strokeDasharray={pathLength(path)}
        strokeDashoffset={pathLength(path) * (1 - progress)}
      />
      {props.children}
    </svg>
  );
}

/** A sketched arrow from (x1,y1) to (x2,y2) with draw-in animation. */
export function HandArrow(props: {
  theme: Theme;
  seed: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const progress = props.progress ?? useDrawProgress(props.startFrame ?? 0, props.durationFrames ?? 24);
  const {x1, y1, x2, y2} = props;
  const midX = (x1 + x2) / 2 + wobble(props.seed, 0) * 10;
  const midY = (y1 + y2) / 2 + wobble(props.seed + 7, 1) * 10;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const headSize = 16;
  const tipX = x2 - ux * 4;
  const tipY = y2 - uy * 4;
  const a1x = tipX - headSize * ux + headSize * 0.5 * -uy;
  const a1y = tipY - headSize * uy + headSize * 0.5 * ux;
  const a2x = tipX - headSize * ux - headSize * 0.5 * -uy;
  const a2y = tipY - headSize * uy - headSize * 0.5 * ux;
  const path = `M ${x1} ${y1} Q ${midX} ${midY} ${tipX} ${tipY}`;
  const headPath = `M ${a1x} ${a1y} L ${tipX} ${tipY} L ${a2x} ${a2y}`;
  const color = props.color ?? props.theme.colors.primary;
  return (
    <svg width={len} height={Math.abs(dy) + 24} viewBox={`${Math.min(x1, x2, midX) - 20} ${Math.min(y1, y2, midY) - 20} ${len + 40} ${Math.abs(dy) + 40}`} style={{position: 'absolute', overflow: 'visible', ...props.style}}>
      <path d={path} fill="none" stroke={color} strokeWidth={props.strokeWidth ?? props.theme.strokes.width} strokeLinecap="round" strokeDasharray={pathLength(path)} strokeDashoffset={pathLength(path) * (1 - progress)} />
      <path d={headPath} fill="none" stroke={color} strokeWidth={props.strokeWidth ?? props.theme.strokes.width} strokeLinecap="round" strokeDasharray={pathLength(headPath)} strokeDashoffset={pathLength(headPath) * (1 - progress)} />
    </svg>
  );
}

/** Marker-style translucent highlight drawn behind content. */
export function MarkerHighlight(props: {
  theme: Theme;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  progress?: number;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const progress = props.progress ?? useDrawProgress(props.startFrame ?? 0, props.durationFrames ?? 18);
  const frame = useCurrentFrame();
  const tilt = 1.2;
  const scaleY = interpolate(progress, [0, 1], [0, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        width: props.width,
        height: props.height,
        background: props.color ?? props.theme.colors.accent,
        opacity: (props.opacity ?? 0.35) * progress,
        transform: `translateX(-6px) skewX(${-tilt}deg) scaleY(${scaleY})`,
        transformOrigin: 'left center',
        borderRadius: 3,
        ...props.style,
      }}
    />
  );
}

/** Wavy hand underline that draws itself in. */
export function HandUnderline(props: {
  theme: Theme;
  width: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const progress = props.progress ?? useDrawProgress(props.startFrame ?? 0, props.durationFrames ?? 20);
  const color = props.color ?? props.theme.colors.accent;
  const strokeWidth = props.strokeWidth ?? Math.max(3, props.theme.strokes.width - 1);
  const segments = 6;
  const step = props.width / segments;
  let path = 'M 0 6 ';
  for (let i = 0; i < segments; i++) {
    const x = (i + 1) * step;
    const y = i % 2 === 0 ? 0 : 10;
    path += `Q ${x - step / 2} ${y} ${x} ${i % 2 === 0 ? 10 : 0} `;
  }
  return (
    <svg width={props.width} height={14} style={{overflow: 'visible', ...props.style}}>
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={pathLength(path)} strokeDashoffset={pathLength(path) * (1 - progress)} />
    </svg>
  );
}

/** Sticky-note tape strip. */
export function StickyTape(props: {theme: Theme; width: number; height?: number; angle?: number; style?: React.CSSProperties}) {
  return (
    <div
      style={{
        position: 'absolute',
        width: props.width,
        height: props.height ?? 28,
        top: -14,
        left: '50%',
        marginLeft: -props.width / 2,
        background: 'rgba(232,163,61,0.5)',
        transform: `rotate(${props.angle ?? -2}deg)`,
        boxShadow: '0 2px 4px rgba(46,42,36,0.15)',
        ...props.style,
      }}
    />
  );
}
