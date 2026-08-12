import type {CaptionSegment} from '@motionknowledge/schemas';

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((ms % 1000));
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function toSrt(segments: CaptionSegment[]): string {
  return segments
    .map((segment, index) => {
      const text = segment.text.replace(/--/g, '-');
      return `${index + 1}\n${formatTimestamp(segment.startMs)} --> ${formatTimestamp(segment.endMs)}\n${text}`;
    })
    .join('\n\n') + (segments.length > 0 ? '\n' : '');
}

export function toTranscript(segments: CaptionSegment[]): string {
  return segments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim();
}
