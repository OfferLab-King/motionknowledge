import {describe, expect, it} from 'vitest';
import {groupCaptions} from './group';
import {toSrt, formatTimestamp} from './srt';
import type {TimedWord} from '@motionknowledge/schemas';

const realWordTimings: TimedWord[] = [
  {text: 'The', startMs: 0, endMs: 140, confidence: 0.9},
  {text: 'discount', startMs: 140, endMs: 420, confidence: 0.9},
  {text: 'rate', startMs: 420, endMs: 700, confidence: 0.9},
  {text: 'reflects', startMs: 700, endMs: 1120, confidence: 0.9},
  {text: 'risk', startMs: 1120, endMs: 1400, confidence: 0.9},
  {text: 'and', startMs: 1400, endMs: 1540, confidence: 0.9},
  {text: 'time.', startMs: 1540, endMs: 1960, confidence: 0.9},
  {text: 'A', startMs: 1960, endMs: 2080, confidence: 0.9},
  {text: 'higher', startMs: 2080, endMs: 2380, confidence: 0.9},
  {text: 'rate', startMs: 2380, endMs: 2660, confidence: 0.9},
  {text: 'lowers', startMs: 2660, endMs: 3080, confidence: 0.9},
  {text: 'value.', startMs: 3080, endMs: 3500, confidence: 0.9},
];

describe('caption grouping from measured timings', () => {
  it('groups measured word timings without estimating from text length', () => {
    const captions = groupCaptions(realWordTimings, {
      maxWords: 7,
      maxDurationMs: 3200,
      maxCharsPerLine: 80,
    });
    expect(captions[0]!.startMs).toBe(realWordTimings[0]!.startMs);
    expect(captions.every((caption) => caption.endMs > caption.startMs)).toBe(true);
    for (const caption of captions) {
      expect(caption.words.length).toBeLessThanOrEqual(7);
      expect(caption.endMs - caption.startMs).toBeLessThanOrEqual(3200);
    }
  });

  it('breaks on phrase boundaries', () => {
    const captions = groupCaptions(realWordTimings, {maxWords: 7, maxDurationMs: 3200, maxCharsPerLine: 80});
    expect(captions[0]!.text).toMatch(/time\.$/);
    expect(captions[1]!.text).toMatch(/^A /);
  });

  it('produces valid SRT', () => {
    const captions = groupCaptions(realWordTimings, {maxWords: 7, maxDurationMs: 3200, maxCharsPerLine: 80});
    const srt = toSrt(captions.map((caption, index) => ({
      schemaVersion: 1,
      sceneId: 'scene-1',
      index,
      startMs: caption.startMs,
      endMs: caption.endMs,
      text: caption.text,
      words: caption.words,
    })));
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:01,960');
    expect(srt).toContain('discount rate reflects risk and time.');
    expect(formatTimestamp(1960)).toBe('00:00:01,960');
  });
});
