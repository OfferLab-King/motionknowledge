import {describe, expect, it} from 'vitest';
import {ThemeTokenSchema} from '@motionknowledge/schemas';
import {
  styleRegistry,
  STYLE_ORDER,
  listStyles,
  getStyleDefinition,
  isRegisteredStyle,
  resolveTheme,
  applyStyleOverrides,
} from './registry';
import {legacyStyleToStyleId} from '../theme';

describe('style registry validation', () => {
  it('registers every expected style with complete metadata', () => {
    expect(STYLE_ORDER).toEqual(['signature', 'handwritten', 'presentation', 'editorial', 'business', 'minimal']);
    for (const styleId of STYLE_ORDER) {
      const style = getStyleDefinition(styleId);
      expect(style).toBeDefined();
      expect(style!.id).toBe(styleId);
      expect(style!.name.length).toBeGreaterThan(0);
      expect(style!.description.length).toBeGreaterThan(10);
      expect(style!.tags.length).toBeGreaterThan(0);
      expect(style!.version).toBeGreaterThanOrEqual(1);
      expect(style!.aspectRatios.length).toBeGreaterThan(0);
      expect(style!.preview).toBe(`showcase:${styleId}`);
      expect(style!.motionPersonality.length).toBeGreaterThan(0);
      expect(Object.keys(style!.componentVariants).length).toBeGreaterThan(0);
    }
  });

  it('parses every style token set against the wire schema', () => {
    for (const styleId of STYLE_ORDER) {
      const parsed = ThemeTokenSchema.safeParse(styleRegistry[styleId]!.tokens);
      expect(parsed.success, `${styleId} tokens must satisfy ThemeTokenSchema`).toBe(true);
    }
  });

  it('keeps style ids unique and versions positive', () => {
    const ids = new Set(listStyles().map((style) => style.id));
    expect(ids.size).toBe(listStyles().length);
    for (const style of listStyles()) {
      expect(style.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('supports 16:9 and 9:16 across the registry', () => {
    const hasLandscape = listStyles().some((style) => style.aspectRatios.includes('16:9'));
    const hasPortrait = listStyles().some((style) => style.aspectRatios.includes('9:16'));
    expect(hasLandscape).toBe(true);
    expect(hasPortrait).toBe(true);
    // The signature style must support both, as it is the default.
    expect(styleRegistry.signature!.aspectRatios).toEqual(['16:9', '9:16']);
  });

  it('resolves every style to a validated theme', () => {
    for (const styleId of STYLE_ORDER) {
      const theme = resolveTheme(styleId);
      expect(theme.visualLanguage).toBe(styleRegistry[styleId]!.tokens.visualLanguage);
      expect(theme.colors.background).toMatch(/^#/);
      expect(theme.colors.chartPalette.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('is deterministic: resolving twice yields identical tokens', () => {
    for (const styleId of STYLE_ORDER) {
      expect(resolveTheme(styleId)).toEqual(resolveTheme(styleId));
    }
  });

  it('rejects unknown style ids', () => {
    expect(isRegisteredStyle('nope')).toBe(false);
    expect(() => resolveTheme('nope')).toThrow(/Unknown style/);
  });

  it('maps legacy free-form style strings onto registered styles', () => {
    expect(legacyStyleToStyleId('professional')).toBe('signature');
    expect(legacyStyleToStyleId('bold')).toBe('editorial');
    expect(legacyStyleToStyleId('minimal')).toBe('minimal');
    expect(legacyStyleToStyleId('something-else')).toBe('signature');
  });
});

describe('style overrides', () => {
  it('swaps the base style when the override names a registered style', () => {
    const base = resolveTheme('signature');
    const swapped = applyStyleOverrides(base, {styleId: 'handwritten'});
    expect(swapped.visualLanguage).toBe('hand-drawn');
    expect(swapped.colors.background).toBe('#FBF5E8');
  });

  it('ignores unknown style ids in overrides', () => {
    const base = resolveTheme('signature');
    const kept = applyStyleOverrides(base, {styleId: 'does-not-exist'});
    expect(kept.visualLanguage).toBe('polished');
  });

  it('applies the background treatment override', () => {
    const theme = applyStyleOverrides(resolveTheme('signature'), {background: 'paper'});
    expect(theme.background.treatment).toBe('paper');
  });

  it('scales motion intensity', () => {
    const base = resolveTheme('signature');
    const subtle = applyStyleOverrides(base, {motionIntensity: 'subtle'});
    expect(subtle.motion.fast).toBe(Math.round(base.motion.fast * 0.7));
    const expressive = applyStyleOverrides(base, {motionIntensity: 'expressive'});
    expect(expressive.motion.fast).toBe(Math.round(base.motion.fast * 1.35));
    const auto = applyStyleOverrides(base, {motionIntensity: 'auto'});
    expect(auto.motion.fast).toBe(base.motion.fast);
  });

  it('applies a component variant override', () => {
    const theme = applyStyleOverrides(resolveTheme('signature'), {variant: 'hand-drawn'}, 'process-flow');
    expect(theme.variants['process-flow']).toBe('hand-drawn');
  });
});
