import {z} from 'zod';

/**
 * The pre-v2 legacy theme shape (flat colors, no style system). Accepted on
 * parse and mapped onto the full token set so persisted manifests and
 * storyboards keep working after the style refactor.
 */
function isLegacyFlatTheme(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !('colors' in value) &&
    typeof (value as Record<string, unknown>).background === 'string'
  );
}

/** Defaults applied to every top-level token group so partial input never breaks parsing. */
const TOKEN_GROUP_DEFAULTS: Record<string, unknown> = {
  fonts: {
    heading: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
    body: `'Inter', 'Helvetica Neue', system-ui, sans-serif`,
    mono: `'JetBrains Mono', 'SF Mono', Menlo, monospace`,
  },
  typography: {display: 92, heading: 64, subheading: 40, body: 32, caption: 24},
  background: {treatment: 'flat', gradient: 'none', texture: 'none'},
  surfaces: {borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'solid', shadow: 'none'},
  strokes: {width: 3, style: 'solid', color: 'rgba(255,255,255,0.2)'},
  borders: {width: 1, color: 'rgba(255,255,255,0.12)', style: 'solid'},
  shadows: {sm: 'none', md: 'none', lg: 'none'},
  radius: {sm: 10, md: 18, lg: 28},
  spacing: {xs: 8, sm: 16, md: 24, lg: 40, xl: 64},
  motion: {fast: 12, normal: 24, slow: 40, reveal: 'fade', spring: {damping: 200, stiffness: 200}, easing: 'linear'},
  transitions: {family: 'crossfade', durationFrames: 18},
  sceneLayout: {align: 'center', titlePosition: 'center'},
  caption: {background: 'rgba(8,17,31,0.7)', text: '#F8FAFC', size: 34, weight: 600, treatment: 'pill'},
  thumbnail: {background: '#08111F', text: '#F8FAFC', accent: '#59D5E0'},
};

const ThemeTokensShape = z.object({
  colors: z.object({
    background: z.string(),
    surface: z.string(),
    surfaceAlt: z.string().default('#0D1B30'),
    primary: z.string(),
    primaryAlt: z.string().default('#8EE9F0'),
    accent: z.string(),
    text: z.string(),
    muted: z.string(),
    danger: z.string(),
    success: z.string().default('#4ADE80'),
    onAccent: z.string().default('#06202B'),
    onSurface: z.string().default('#F8FAFC'),
    chartPalette: z.array(z.string()).min(3).default(['#59D5E0', '#F7C948', '#8B5CF6']),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
    mono: z.string(),
  }),
  typography: z.object({
    display: z.number(),
    heading: z.number(),
    subheading: z.number(),
    body: z.number(),
    caption: z.number(),
  }),
  background: z.object({
    treatment: z.enum(['flat', 'gradient', 'paper', 'texture', 'grid']),
    gradient: z.string(),
    texture: z.string(),
  }),
  surfaces: z.object({
    borderWidth: z.number(),
    borderColor: z.string(),
    borderStyle: z.enum(['solid', 'dashed', 'none']),
    shadow: z.string(),
  }),
  strokes: z.object({
    width: z.number(),
    style: z.enum(['solid', 'dashed', 'sketch']),
    color: z.string(),
  }),
  borders: z.object({
    width: z.number(),
    color: z.string(),
    style: z.enum(['solid', 'dashed', 'double', 'none']),
  }),
  shadows: z.object({sm: z.string(), md: z.string(), lg: z.string()}),
  radius: z.object({sm: z.number(), md: z.number(), lg: z.number()}),
  spacing: z.object({xs: z.number(), sm: z.number(), md: z.number(), lg: z.number(), xl: z.number()}),
  safeAreaX: z.number().default(96),
  safeAreaY: z.number().default(64),
  motion: z.object({
    fast: z.number(),
    normal: z.number(),
    slow: z.number(),
    reveal: z.enum(['fade', 'slide-up', 'scale', 'draw']),
    spring: z.object({damping: z.number(), stiffness: z.number()}),
    easing: z.enum(['linear', 'ease-out', 'ease-in-out']),
  }),
  transitions: z.object({
    family: z.enum(['crossfade', 'slide', 'scale', 'draw']),
    durationFrames: z.number(),
  }),
  density: z.enum(['spacious', 'comfortable', 'compact']).default('comfortable'),
  visualLanguage: z.enum(['polished', 'hand-drawn', 'structured', 'infographic', 'business', 'minimal']).default('polished'),
  variants: z.record(z.string(), z.string()).default({}),
  sceneLayout: z.object({
    align: z.enum(['center', 'start', 'space-between']),
    titlePosition: z.enum(['top', 'center']),
  }),
  caption: z.object({
    background: z.string(),
    text: z.string(),
    size: z.number(),
    weight: z.number(),
    treatment: z.string(),
  }),
  thumbnail: z.object({
    background: z.string(),
    text: z.string(),
    accent: z.string(),
  }),
  illustration: z.string().default('flat-graphic'),
  icon: z.string().default('line'),
  chart: z.string().default('modern'),
  diagram: z.string().default('polished'),
  annotation: z.string().default('callout'),
  emphasis: z.string().default('color'),
});

/**
 * Full visual style token set. This is the single source of truth for how a
 * style renders: the wire format in manifests/storyboards AND the `Theme` type
 * consumed by visual-library components are both derived from it.
 *
 * The pre-v2 flat shape (background/surface/primary/.../safeAreaX/safeAreaY)
 * is accepted and mapped onto the full token set, so persisted v1 manifests
 * and storyboards keep parsing; every new field has a default.
 */
export const ThemeTokenSchema = z.preprocess((value) => {
  if (typeof value !== 'object' || value === null) return value;
  const input = value as Record<string, unknown>;
  const fillMissing = () => {
    const rest: Record<string, unknown> = {};
    for (const [key, defaultValue] of Object.entries(TOKEN_GROUP_DEFAULTS)) {
      if (input[key] === undefined) rest[key] = defaultValue;
    }
    return rest;
  };
  if (isLegacyFlatTheme(input)) {
    const LEGACY_KEYS = ['background', 'surface', 'primary', 'accent', 'text', 'muted', 'danger', 'safeAreaX', 'safeAreaY'] as const;
    const extra: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input)) {
      if (!(LEGACY_KEYS as ReadonlyArray<string>).includes(key)) extra[key] = item;
    }
    const rest: Record<string, unknown> = {};
    for (const [key, defaultValue] of Object.entries(TOKEN_GROUP_DEFAULTS)) {
      if (input[key] === undefined || (LEGACY_KEYS as ReadonlyArray<string>).includes(key)) rest[key] = defaultValue;
    }
    return {
      ...rest,
      ...extra,
      colors: {
        background: input.background,
        surface: input.surface,
        primary: input.primary,
        accent: input.accent,
        text: input.text,
        muted: input.muted,
        danger: input.danger,
      },
    };
  }
  // Partial new-shape input (e.g. a theme created before a token group was
  // added): fill missing groups with defaults so parsing never breaks.
  return Object.assign({}, input, fillMissing());
}, ThemeTokensShape);

/** High-level per-scene overrides. Expert controls, kept deliberately small. */
export const StyleOverrideSchema = z.object({
  styleId: z.string().optional(),
  variant: z.string().optional(),
  background: z.enum(['auto', 'flat', 'gradient', 'paper', 'texture', 'grid']).optional(),
  motionIntensity: z.enum(['auto', 'subtle', 'standard', 'expressive']).optional(),
});

/** Identity of a style as persisted on projects and manifests. */
export const StyleIdentitySchema = z.object({
  styleId: z.string().min(1),
  styleVersion: z.number().int().positive(),
});

export type ThemeTokens = z.output<typeof ThemeTokenSchema>;
export type StyleOverride = z.infer<typeof StyleOverrideSchema>;
export type StyleIdentity = z.infer<typeof StyleIdentitySchema>;
