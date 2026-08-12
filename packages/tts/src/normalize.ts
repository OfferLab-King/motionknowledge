import type {TimedWord} from '@motionknowledge/schemas';

export function assertMonotonicTimings(timings: TimedWord[]): TimedWord[] {
  let previousEnd = -1;
  for (const word of timings) {
    if (word.startMs < 0 || word.endMs < word.startMs || word.startMs < previousEnd) {
      throw new Error('Provider returned non-monotonic or overlapping word timings');
    }
    previousEnd = word.endMs;
  }
  return timings;
}

export function normalizeTimedWords(input: Array<{word: string; startMs: number; endMs: number; confidence?: number | null}>): TimedWord[] {
  const words = input
    .map((item) => ({
      text: item.word.trim(),
      startMs: Math.max(0, Math.round(item.startMs)),
      endMs: Math.max(0, Math.round(item.endMs)),
      confidence: item.confidence ?? null,
    }))
    .filter((item) => item.text.length > 0);
  if (words.length === 0) throw new Error('Provider returned no word timings');
  return assertMonotonicTimings(words);
}
