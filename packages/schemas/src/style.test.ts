import {describe, expect, it} from 'vitest';
import {ThemeTokenSchema, StyleOverrideSchema, StyleIdentitySchema} from './style';
import {VideoProjectV1} from './project';
import {SceneV1, StoryboardV1} from './scene';
import {RenderManifestV1} from './render';

const baseTheme = {
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
    chartPalette: ['#59D5E0', '#F7C948', '#8B5CF6'],
  },
  fonts: {heading: 'sans-serif', body: 'sans-serif', mono: 'monospace'},
};

describe('style token schema', () => {
  it('round-trips a full token set through JSON', () => {
    const theme = ThemeTokenSchema.parse({...baseTheme, visualLanguage: 'hand-drawn'});
    const cloned = JSON.parse(JSON.stringify(theme));
    expect(ThemeTokenSchema.parse(cloned)).toEqual(theme);
  });

  it('defaults every optional token so legacy manifests still parse', () => {
    const legacy = ThemeTokenSchema.parse({
      background: '#08111F',
      surface: '#10213A',
      primary: '#59D5E0',
      accent: '#F7C948',
      text: '#F8FAFC',
      muted: '#9FB2C8',
      danger: '#FB7185',
      safeAreaX: 96,
      safeAreaY: 64,
    });
    expect(legacy.colors.background).toBe('#08111F');
    expect(legacy.visualLanguage).toBe('polished');
    expect(legacy.motion.reveal).toBe('fade');
    expect(legacy.radius.md).toBe(18);
    expect(legacy.density).toBe('comfortable');
  });

  it('validates scene style overrides', () => {
    const override = StyleOverrideSchema.parse({styleId: 'handwritten', background: 'paper', motionIntensity: 'subtle'});
    expect(override.motionIntensity).toBe('subtle');
    expect(StyleOverrideSchema.parse({}).background).toBeUndefined();
  });
});

describe('project schema with style identity', () => {
  it('round-trips format, template and style identity', () => {
    const project = VideoProjectV1.parse({
      schemaVersion: 1,
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      title: 'Why compound interest accelerates',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
      format: 'tutorial',
      templateId: 'whiteboard-teacher',
      styleId: 'handwritten',
      styleVersion: 2,
      aspectRatio: '9:16',
      status: 'DRAFT',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
    expect(project.format).toBe('tutorial');
    expect(project.templateId).toBe('whiteboard-teacher');
    expect(project.styleId).toBe('handwritten');
    expect(project.styleVersion).toBe(2);
    expect(VideoProjectV1.parse(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  it('defaults legacy projects to the signature style', () => {
    const legacy = VideoProjectV1.parse({
      schemaVersion: 1,
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      title: 'Old project',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
      status: 'DRAFT',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
    expect(legacy.styleId).toBe('signature');
    expect(legacy.styleVersion).toBe(1);
    expect(legacy.format).toBe('explainer');
    expect(legacy.templateId).toBeNull();
  });
});

describe('scene schema with style overrides', () => {
  function scene(overrides: Record<string, unknown> = {}) {
    return SceneV1.parse({
      schemaVersion: 1,
      id: 'scene-1',
      sceneVersionId: 'scene-1-v1',
      index: 0,
      title: 'The loop',
      narration: 'Interest earns interest.',
      durationSeconds: 10,
      claimIds: ['claim-1'],
      chapterId: 'chapter-1',
      visual: {
        type: 'catalog',
        schemaVersion: 1,
        intent: 'show',
        data: {visualId: 'process-flow', title: 'Loop', data: {title: 'Loop', steps: ['A', 'B']}},
      },
      provider: {provider: 'mock', model: 'mock-dcf', costUsd: '0', durationMs: 0},
      inputHash: 'a'.repeat(64),
      ...overrides,
    });
  }

  it('round-trips a per-scene style override', () => {
    const parsed = scene({styleOverride: {styleId: 'editorial', background: 'flat', motionIntensity: 'expressive'}});
    expect(parsed.styleOverride.styleId).toBe('editorial');
    const cloned = JSON.parse(JSON.stringify(parsed));
    expect(SceneV1.parse(cloned)).toEqual(parsed);
  });

  it('defaults missing overrides to an empty object', () => {
    const parsed = scene();
    expect(parsed.styleOverride).toEqual({});
  });

  it('storyboard round-trips format, template and style', () => {
    const storyboard = StoryboardV1.parse({
      schemaVersion: 1,
      id: 'sb-1',
      scenes: [scene()],
      format: 'course-lesson',
      templateId: 'clean-slide-lesson',
      styleId: 'presentation',
    });
    expect(storyboard.format).toBe('course-lesson');
    expect(storyboard.styleId).toBe('presentation');
    expect(StoryboardV1.parse(JSON.parse(JSON.stringify(storyboard)))).toEqual(storyboard);
  });

  it('accepts legacy storyboards (flat theme, no style fields)', () => {
    const legacy = StoryboardV1.parse({
      schemaVersion: 1,
      id: 'sb-old',
      scenes: [scene()],
      theme: {
        background: '#08111F',
        surface: '#10213A',
        primary: '#59D5E0',
        accent: '#F7C948',
        text: '#F8FAFC',
        muted: '#9FB2C8',
        danger: '#FB7185',
        safeAreaX: 96,
        safeAreaY: 64,
      },
    });
    expect(legacy.styleId).toBe('signature');
    expect(legacy.format).toBe('explainer');
  });
});

describe('render manifest with style identity', () => {
  it('round-trips full theme tokens and style identity', () => {
    const manifest = RenderManifestV1.parse({
      schemaVersion: 1,
      id: 'manifest-1',
      projectId: 'p-1',
      title: 'Compound interest',
      width: 1280,
      height: 720,
      fps: 30,
      totalDurationInFrames: 150,
      theme: ThemeTokenSchema.parse({...baseTheme, visualLanguage: 'minimal'}),
      style: {styleId: 'minimal', styleVersion: 1},
      burnedCaptions: false,
      scenes: [
        {
          sceneVersionId: 'sv-1',
          sceneId: 's-1',
          title: 'Title',
          index: 0,
          startFrame: 0,
          durationInFrames: 150,
          fps: 30,
          narrationAudioKey: null,
          narrationStartMs: 0,
          captionSegments: [],
          visual: {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'X'}},
          styleOverride: {styleId: 'business', motionIntensity: 'subtle'},
          inputHash: 'b'.repeat(64),
        },
      ],
      audioTracks: [],
      musicTrackKey: null,
      inputHash: 'c'.repeat(64),
    });
    expect(manifest.style.styleId).toBe('minimal');
    expect(manifest.burnedCaptions).toBe(false);
    expect(manifest.scenes[0]!.styleOverride.styleId).toBe('business');
    expect(RenderManifestV1.parse(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it('accepts a legacy manifest (flat theme) and defaults style identity', () => {
    const legacy = RenderManifestV1.parse({
      schemaVersion: 1,
      id: 'manifest-old',
      projectId: 'p-1',
      title: 'Old',
      width: 640,
      height: 360,
      fps: 30,
      totalDurationInFrames: 60,
      theme: {
        background: '#08111F',
        surface: '#10213A',
        primary: '#59D5E0',
        accent: '#F7C948',
        text: '#F8FAFC',
        muted: '#9FB2C8',
        danger: '#FB7185',
        safeAreaX: 96,
        safeAreaY: 64,
      },
      scenes: [
        {
          sceneVersionId: 'sv-old',
          sceneId: 's-old',
          title: 'Old',
          index: 0,
          startFrame: 0,
          durationInFrames: 60,
          fps: 30,
          narrationAudioKey: null,
          narrationStartMs: 0,
          captionSegments: [],
          visual: {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'X'}},
          inputHash: 'd'.repeat(64),
        },
      ],
      audioTracks: [],
      musicTrackKey: null,
      inputHash: 'c'.repeat(64),
    });
    expect(legacy.style).toEqual({styleId: 'signature', styleVersion: 1});
    expect(legacy.theme.visualLanguage).toBe('polished');
  });

  it('validates style identity', () => {
    expect(() => StyleIdentitySchema.parse({styleId: '', styleVersion: 0})).toThrow();
    expect(StyleIdentitySchema.parse({styleId: 'signature', styleVersion: 3}).styleVersion).toBe(3);
  });
});
