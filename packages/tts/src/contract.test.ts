import {describe, expect, it} from 'vitest';
import {normalizeTimedWords} from './normalize';
import {MockTTSProvider} from './mock';

describe('tts timing normalization', () => {
  it('rejects provider output with non-monotonic timestamps', () => {
    expect(() =>
      normalizeTimedWords([
        {word: 'one', startMs: 0, endMs: 200},
        {word: 'two', startMs: 100, endMs: 300},
      ]),
    ).toThrow('non-monotonic');
  });

  it('accepts well-ordered timestamps', () => {
    const words = normalizeTimedWords([
      {word: ' one ', startMs: 0, endMs: 200},
      {word: 'two', startMs: 220, endMs: 400},
    ]);
    expect(words).toHaveLength(2);
    expect(words[0]!.text).toBe('one');
    expect(words[1]!.startMs).toBe(220);
  });

  it('mock provider produces measured timings from real audio', async () => {
    const provider = new MockTTSProvider();
    const result = await provider.synthesize({
      text: 'discount rate',
      voice: 'mock',
      sampleRateHz: 24000,
      idempotencyKey: 'tts-contract-1',
    });
    expect(result.data.audioBytes.length).toBeGreaterThan(100);
    expect(result.data.wordTimings).toHaveLength(2);
    expect(result.data.wordTimings[0]!.startMs).toBe(0);
    expect(result.data.wordTimings[1]!.startMs).toBeGreaterThanOrEqual(result.data.wordTimings[0]!.endMs);
    expect(result.data.durationMs).toBeGreaterThanOrEqual(result.data.wordTimings.at(-1)!.endMs);
  });
});
