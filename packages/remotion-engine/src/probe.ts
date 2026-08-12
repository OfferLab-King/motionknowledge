import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

export interface MediaProbe {
  width: number;
  height: number;
  durationSeconds: number;
  videoCodec: string;
  audioCodec: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
  fps: number;
}

export async function probeVideo(path: string): Promise<MediaProbe> {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    path,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: {duration?: string};
    streams?: Array<{
      codec_type: string;
      codec_name: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
    }>;
  };
  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  const [fpsNum, fpsDen] = (video?.avg_frame_rate ?? '0/1').split('/').map(Number);
  const fps = fpsDen ? (fpsNum ?? 0) / fpsDen : 0;
  return {
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    durationSeconds: Number(parsed.format?.duration ?? 0),
    videoCodec: video?.codec_name ?? 'none',
    audioCodec: audio?.codec_name ?? null,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    fps,
  };
}

export async function detectAudioLevels(path: string): Promise<{maxVolumeDb: number; meanVolumeDb: number}> {
  const {stderr} = await execFileAsync('ffmpeg', [
    '-hide_banner',
    '-i', path,
    '-af', 'volumedetect',
    '-f', 'null',
    '-',
  ]);
  const maxMatch = stderr.match(/max_volume: (-?[\d.]+) dB/);
  const meanMatch = stderr.match(/mean_volume: (-?[\d.]+) dB/);
  return {
    maxVolumeDb: maxMatch ? Number(maxMatch[1]) : -Infinity,
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : -Infinity,
  };
}
