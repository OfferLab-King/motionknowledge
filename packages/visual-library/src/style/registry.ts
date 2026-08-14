import {ThemeTokenSchema, type StyleOverride} from '@motionknowledge/schemas';
import type {Theme} from '../theme';
import {
  signatureStyle,
  handwrittenStyle,
  presentationStyle,
  editorialStyle,
  businessStyle,
  minimalStyle,
  type VisualStylePack,
} from './styles';

/**
 * Machine-readable style registry. Adding a new style means adding a pack here
 * (and a variant renderer if it needs a new visual language); no pipeline
 * stage, schema or web page needs to change.
 */
export const styleRegistry: Readonly<Record<string, VisualStylePack>> = {
  signature: signatureStyle,
  handwritten: handwrittenStyle,
  presentation: presentationStyle,
  editorial: editorialStyle,
  business: businessStyle,
  minimal: minimalStyle,
};

export const STYLE_ORDER: ReadonlyArray<string> = [
  'signature',
  'handwritten',
  'presentation',
  'editorial',
  'business',
  'minimal',
];

export function listStyles(): VisualStylePack[] {
  return STYLE_ORDER.map((id) => styleRegistry[id]!).filter(Boolean);
}

export function getStyleDefinition(styleId: string): VisualStylePack | undefined {
  return styleRegistry[styleId];
}

export function isRegisteredStyle(styleId: string): boolean {
  return styleId in styleRegistry;
}

/** Resolve a style id to its validated token set. */
export function resolveTheme(styleId: string): Theme {
  const style = getStyleDefinition(styleId);
  if (!style) throw new Error(`Unknown style id: ${styleId}`);
  return ThemeTokenSchema.parse(style.tokens) as Theme;
}

const MOTION_INTENSITY_SCALE: Readonly<Record<NonNullable<StyleOverride['motionIntensity']>, number>> = {
  auto: 1,
  subtle: 0.7,
  standard: 1,
  expressive: 1.35,
};

/**
 * Merge a per-scene override onto a base token set. This is the single place
 * where scene-level style controls are applied, so the browser Player and the
 * worker render path interpret scenes identically.
 */
export function applyStyleOverrides(
  base: Theme,
  override: StyleOverride | undefined,
  componentId?: string,
): Theme {
  const o = override ?? {};
  if (o.styleId && isRegisteredStyle(o.styleId)) {
    // Swap to the named style's tokens, then apply the remaining overrides
    // (background, motion, variant) on top. styleId is dropped to avoid
    // recursing on itself.
    const rest: StyleOverride = {...o};
    delete rest.styleId;
    return applyStyleOverrides(resolveTheme(o.styleId), rest, componentId);
  }
  const tokens: Theme = {...base};
  if (o.background && o.background !== 'auto') {
    tokens.background = {...tokens.background, treatment: o.background};
  }
  if (o.motionIntensity && o.motionIntensity !== 'auto') {
    const scale = MOTION_INTENSITY_SCALE[o.motionIntensity] ?? 1;
    tokens.motion = {
      ...tokens.motion,
      fast: Math.round(tokens.motion.fast * scale),
      normal: Math.round(tokens.motion.normal * scale),
      slow: Math.round(tokens.motion.slow * scale),
    };
  }
  if (o.variant && componentId) {
    tokens.variants = {...tokens.variants, [componentId]: o.variant};
  }
  return tokens;
}

/** Resolve the effective token set for one scene of a manifest. */
export function resolveSceneTheme(
  manifestTheme: Theme,
  sceneOverride: StyleOverride | undefined,
  componentId?: string,
): Theme {
  return applyStyleOverrides(manifestTheme, sceneOverride, componentId);
}
