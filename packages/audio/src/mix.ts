import type {TTSManifest} from '@motionknowledge/schemas';
import {loudnormPlan} from './loudness';
import {runFfmpeg, probeAudio} from './ffmpeg';

export interface NarrationTrack {
  path: string;
  sceneVersionId: string;
  offsetMs: number;
}

export interface MixPlan {
  inputs: string[];
  filterGraph: string;
  outputArgs: string[];
}

export interface AudioMixer {
  mix(input: {
    narrationTracks: NarrationTrack[];
    musicTrackPath?: string;
    outputPath: string;
    musicRelativeDb: number;
  }): Promise<{path: string; durationSeconds: number}>;
}

export function buildMixPlan(input: {
  narrationTracks: NarrationTrack[];
  musicTrackPath?: string;
  musicRelativeDb: number;
}): MixPlan {
  const inputs: string[] = [];
  const labels: string[] = [];
  for (const track of input.narrationTracks) {
    inputs.push(track.path);
    labels.push(`[${inputs.length - 1}:a]adelay=${track.offsetMs}|${track.offsetMs},apad[n${inputs.length - 1}]`);
  }
  const narrationLabel = inputs.length > 1 ? `[n0]amix=inputs=${inputs.length}[narration]` : '[n0]narration';
  const filterGraph: string[] = [];
  for (const label of labels) filterGraph.push(label);
  if (input.narrationTracks.length > 0) filterGraph.push(narrationLabel);
  if (input.musicTrackPath) {
    const musicInputIndex = inputs.length;
    inputs.push(input.musicTrackPath);
    const duckVolume = Math.pow(10, input.musicRelativeDb / 20);
    filterGraph.push(`[${musicInputIndex}:a]volume=${duckVolume.toFixed(4)}[music]`);
    filterGraph.push(`[narration][music]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=400[musicDucked]`);
    filterGraph.push(`[narration][musicDucked]amix=inputs=2:normalize=0[out]`);
  } else if (input.narrationTracks.length > 0) {
    filterGraph.push(`[narration]anull[out]`);
  } else {
    filterGraph.push('anullsrc[out]');
  }
  const loud = loudnormPlan();
  return {
    inputs,
    filterGraph: filterGraph.join(';'),
    outputArgs: [...loud.normalizeArgs, '-c:a', 'aac', '-b:a', '192k'],
  };
}

export class FfmpegAudioMixer implements AudioMixer {
  async mix(input: {
    narrationTracks: NarrationTrack[];
    musicTrackPath?: string;
    outputPath: string;
    musicRelativeDb: number;
  }): Promise<{path: string; durationSeconds: number}> {
    const plan = buildMixPlan(input);
    const args = ['-y', ...plan.inputs.flatMap((path) => ['-i', path]), '-filter_complex', plan.filterGraph, '-map', '[out]', ...plan.outputArgs, input.outputPath];
    await runFfmpeg(args);
    const probe = await probeAudio(input.outputPath);
    return {path: input.outputPath, durationSeconds: probe.durationSeconds};
  }
}

export {probeAudio, runFfmpeg};
export {loudnormPlan, isWithinLoudnessRange} from './loudness';
