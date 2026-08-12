import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

export interface MediaProbe {
  width: number;
  height: number;
  durationSeconds: number;
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
  const video = (parsed.streams ?? []).find((s) => s.codec_type === 'video');
  const [num, den] = (video?.avg_frame_rate ?? '0/1').split('/').map(Number);
  return {
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    durationSeconds: Number(parsed.format?.duration ?? 0),
    fps: den ? (num ?? 0) / den : 0,
  };
}
