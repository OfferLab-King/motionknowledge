import {describe, expect, it} from 'vitest';
import {renderToString} from 'react-dom/server';
import {Internals} from 'remotion';
import type {ReactNode} from 'react';
import {BurnedCaptions} from '../components/captions';
import {resolveTheme} from './registry';

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

function harness(children: ReactNode) {
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
          {children}
        </Internals.TimelineContext.Provider>
      </Internals.CompositionManager.Provider>
    </Internals.CanUseRemotionHooks.Provider>
  );
}

const segments = [
  {startMs: 0, endMs: 2000, text: 'Interest earns interest.'},
  {startMs: 2000, endMs: 4000, text: 'Growth accelerates.'},
];

describe('burned captions', () => {
  it('renders the caption active at the current frame', () => {
    // Frame 30 @ 30fps = 1000ms → first segment.
    for (const styleId of ['signature', 'handwritten', 'presentation', 'editorial', 'business', 'minimal']) {
      const theme = resolveTheme(styleId);
      const html = renderToString(
        harness(<BurnedCaptions theme={theme} segments={segments} />),
      );
      expect(html, styleId).toContain('Interest earns interest.');
      expect(html, styleId).not.toContain('Growth accelerates.');
    }
  });

  it('shows nothing when no segment is active', () => {
    // Frame 30 + 8s offset is beyond the segments… the harness is fixed at
    // frame 30, so simulate inactivity by passing empty segments.
    const theme = resolveTheme('signature');
    const html = renderToString(harness(<BurnedCaptions theme={theme} segments={[]} />));
    expect(html.trim()).toBe('');
  });

  it('renders distinct treatments per style', () => {
    const outputs = new Map<string, string>();
    for (const styleId of ['signature', 'handwritten', 'editorial', 'minimal']) {
      outputs.set(styleId, renderToString(harness(<BurnedCaptions theme={resolveTheme(styleId)} segments={segments} />)));
    }
    expect(new Set(outputs.values()).size).toBeGreaterThan(1);
  });
});
