import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

export interface FfmpegProbe {
  durationSeconds: number;
  sampleRateHz: number;
  channels: number;
}

export async function probeAudio(path: string): Promise<FfmpegProbe> {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    path,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: {duration?: string};
    streams?: Array<{codec_type: string; sample_rate?: string; channels?: number}>;
  };
  const audio = (parsed.streams ?? []).find((s) => s.codec_type === 'audio');
  return {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    sampleRateHz: Number(audio?.sample_rate ?? 0),
    channels: audio?.channels ?? 0,
  };
}

export async function runFfmpeg(args: string[], timeoutMs = 300_000): Promise<string> {
  const {stdout} = await execFileAsync('ffmpeg', args, {timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024});
  return stdout;
}
