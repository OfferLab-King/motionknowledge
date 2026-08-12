import type {CaptionSegment, TimedWord} from '@motionknowledge/schemas';

export interface GroupingOptions {
  maxWords: number;
  maxDurationMs: number;
  maxCharsPerLine: number;
  maxLines?: number;
}

export interface GroupedCaption {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  words: TimedWord[];
}

const PHRASE_BOUNDARY = /[.!?,;:]\s*$/;
const SOFT_BOUNDARY = /[,\s]$/;

export function groupCaptions(wordTimings: TimedWord[], options: GroupingOptions): GroupedCaption[] {
  if (wordTimings.length === 0) throw new Error('Cannot group empty word timings');
  const groups: GroupedCaption[] = [];
  let current: TimedWord[] = [];
  const flush = () => {
    if (current.length === 0) return;
    groups.push({
      index: groups.length,
      startMs: current[0]!.startMs,
      endMs: current.at(-1)!.endMs,
      text: current.map((word) => word.text).join(' '),
      words: [...current],
    });
    current = [];
  };
  for (const word of wordTimings) {
    const projectedEnd = word.endMs;
    const projectedStart = current.length > 0 ? current[0]!.startMs : word.startMs;
    const fitsDuration = current.length === 0 || projectedEnd - projectedStart <= options.maxDurationMs;
    const fitsWords = current.length < options.maxWords;
    const lineLength = current.length > 0 ? current.map((w) => w.text.length).reduce((a, b) => a + b, 0) + current.length + word.text.length : word.text.length;
    const fitsLines = lineLength <= options.maxCharsPerLine * (options.maxLines ?? 1);
    const phraseBreak = current.length > 0 && PHRASE_BOUNDARY.test(current.at(-1)!.text);
    const softBreak = current.length > 0 && SOFT_BOUNDARY.test(current.at(-1)!.text) && current.length >= 3;
    if (current.length > 0 && (!fitsDuration || !fitsWords || !fitsLines || phraseBreak || softBreak)) {
      flush();
    }
    current.push(word);
  }
  flush();
  return groups;
}
