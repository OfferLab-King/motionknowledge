import {describe, expect, it} from 'vitest';
import {renderToString} from 'react-dom/server';
import {Internals} from 'remotion';
import type {ReactNode} from 'react';
import {visualRegistry} from '../registry';
import {visualFixtures} from '../fixtures';
import {resolveTheme} from './registry';
import {STYLE_ORDER} from './registry';
import type {Theme} from '../theme';

const fakeComposition = {
  id: 'test',
  durationInFrames: 240,
  fps: 30,
  width: 1280,
  height: 720,
  defaultProps: {},
  props: {},
  defaultCodec: null,
  defaultOutName: null,
  defaultVideoImageFormat: null,
  defaultPixelFormat: null,
  defaultProResProfile: null,
  defaultSampleRate: null,
  component: () => null,
  calculateMetadata: undefined,
} as unknown as Parameters<typeof Internals.CompositionManager.Provider>[0]['value']['compositions'][number];

/**
 * Renders a visual component outside of the Player/Studio, using the same
 * context providers the Player uses, so unit tests can exercise every
 * component under every style deterministically (frame = 30).
 */
function RemotionTestHarness(props: {children: ReactNode}) {
  return (
    <Internals.CanUseRemotionHooks.Provider value={true}>
      <Internals.CompositionManager.Provider
        value={{
          compositions: [fakeComposition],
          folders: [],
          currentCompositionMetadata: null,
          canvasContent: {type: 'composition', compositionId: 'test'},
        }}
      >
        <Internals.TimelineContext.Provider
          value={{
            frame: {test: 30},
            playing: false,
            imperativePlaying: {current: false},
            audioAndVideoTags: {current: []},
          }}
        >
          {props.children}
        </Internals.TimelineContext.Provider>
      </Internals.CompositionManager.Provider>
    </Internals.CanUseRemotionHooks.Provider>
  );
}

describe('semantic components render under every supported style', () => {
  const componentIds = Object.keys(visualRegistry);
  const themes: ReadonlyArray<[string, Theme]> = STYLE_ORDER.map((styleId) => [styleId, resolveTheme(styleId)]);

  it(`renders all ${componentIds.length} registered components under all ${themes.length} styles`, () => {
    for (const componentId of componentIds) {
      const definition = visualRegistry[componentId]!;
      const fixtureKey = definition.preview.replace(/^fixture:/, '');
      const fixture = visualFixtures[fixtureKey];
      expect(fixture).toBeDefined();
      const parsed = definition.propsSchema.safeParse(fixture);
      expect(parsed.success, `${componentId} fixture must parse`).toBe(true);
      if (!parsed.success) continue;
      for (const [styleId, theme] of themes) {
        const html = renderToString(
          <RemotionTestHarness>
            <definition.component data={parsed.data} theme={theme} durationInFrames={240} />
          </RemotionTestHarness>,
        );
        expect(html.length, `${componentId} under ${styleId} must produce markup`).toBeGreaterThan(50);
      }
    }
  });

  it('renders ProcessFlow with a distinct treatment per visual language', () => {
    const definition = visualRegistry['process-flow']!;
    const fixture = visualFixtures['process-flow'];
    const parsed = definition.propsSchema.parse(fixture);
    const outputs = new Map<string, string>();
    for (const [styleId, theme] of themes) {
      const html = renderToString(
        <RemotionTestHarness>
          <definition.component data={parsed} theme={theme} durationInFrames={240} />
        </RemotionTestHarness>,
      );
      outputs.set(styleId, html);
    }
    // Hand-drawn renders sketch SVG paths; minimal renders no panel boxes.
    const unique = new Set(outputs.values());
    expect(unique.size).toBeGreaterThan(2);
    expect(outputs.get('handwritten')!).toContain('<svg');
  });

  it('renders identically at the same frame (determinism)', () => {
    const definition = visualRegistry['title-hero']!;
    const fixture = visualFixtures['title-hero'];
    const parsed = definition.propsSchema.parse(fixture);
    const theme = resolveTheme('signature');
    const first = renderToString(
      <RemotionTestHarness>
        <definition.component data={parsed} theme={theme} durationInFrames={240} />
      </RemotionTestHarness>,
    );
    const second = renderToString(
      <RemotionTestHarness>
        <definition.component data={parsed} theme={theme} durationInFrames={240} />
      </RemotionTestHarness>,
    );
    expect(first).toBe(second);
  });
});
