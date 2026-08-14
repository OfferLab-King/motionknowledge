import {z} from 'zod';
import {ThemeTokenSchema} from '@motionknowledge/schemas';

/**
 * The Theme is the full validated token set produced by a style. Components
 * receive it via props and must never depend on a global singleton, so that a
 * single composition can mix styles.
 */
export type Theme = z.output<typeof ThemeTokenSchema>;

/**
 * MotionKnowledge Signature — the default identity. A sophisticated dark
 * professional look with teal accents, strong modern typography, clean
 * animated diagrams, smooth springs and subtle depth.
 */
export const professionalTheme: Theme = {
  colors: {
    background: '#08111F',
    surface: '#10213A',
    surfaceAlt: '#0D1B30',
    primary: '#59D5E0',
    primaryAlt: '#8EE9F0',
    accent: '#F7C948',
    text: '#F8FAFC',
    muted: '#9FB2C8',
    danger: '#FB7185',
    success: '#4ADE80',
    onAccent: '#06202B',
    onSurface: '#F8FAFC',
    chartPalette: ['#59D5E0', '#F7C948', '#8B5CF6', '#4ADE80', '#FB923C', '#38BDF8'],
  },
  fonts: {
    heading: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
    body: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
    mono: `'JetBrains Mono', 'SF Mono', Menlo, monospace`,
  },
  typography: {display: 92, heading: 64, subheading: 40, body: 32, caption: 24},
  background: {
    treatment: 'gradient',
    gradient: 'linear-gradient(180deg, #0A1526 0%, #08111F 100%)',
    texture: 'none',
  },
  surfaces: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'solid',
    shadow: '0 24px 60px rgba(0,0,0,0.45)',
  },
  strokes: {width: 3, style: 'solid', color: 'rgba(255,255,255,0.2)'},
  borders: {width: 1, color: 'rgba(255,255,255,0.12)', style: 'solid'},
  shadows: {
    sm: '0 4px 12px rgba(0,0,0,0.3)',
    md: '0 12px 32px rgba(0,0,0,0.4)',
    lg: '0 24px 60px rgba(0,0,0,0.45)',
  },
  radius: {sm: 10, md: 18, lg: 28},
  spacing: {xs: 8, sm: 16, md: 24, lg: 40, xl: 64},
  safeAreaX: 96,
  safeAreaY: 64,
  motion: {
    fast: 12,
    normal: 24,
    slow: 40,
    reveal: 'slide-up',
    spring: {damping: 200, stiffness: 200},
    easing: 'linear',
  },
  transitions: {family: 'crossfade', durationFrames: 18},
  density: 'comfortable',
  visualLanguage: 'polished',
  variants: {'process-flow': 'polished'},
  sceneLayout: {align: 'center', titlePosition: 'center'},
  caption: {background: 'rgba(8,17,31,0.7)', text: '#F8FAFC', size: 34, weight: 600, treatment: 'pill'},
  thumbnail: {background: '#08111F', text: '#F8FAFC', accent: '#59D5E0'},
  illustration: 'flat-graphic',
  icon: 'line',
  chart: 'modern',
  diagram: 'polished',
  annotation: 'callout',
  emphasis: 'color',
};

/** Legacy free-form style strings → registered style ids. */
export function legacyStyleToStyleId(legacy: string): string {
  switch (legacy) {
    case 'professional':
      return 'signature';
    case 'bold':
      return 'editorial';
    case 'minimal':
      return 'minimal';
    default:
      return 'signature';
  }
}
