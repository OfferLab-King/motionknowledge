import {runFfmpeg} from './ffmpeg';

/**
 * Deterministic soft ambient music bed: three low sines, lowpassed, gently
 * tremolo'd, at a quiet level under narration. Generated procedurally so no
 * third-party audio asset or license is involved.
 */
export async function generateMusicBed(input: {
  durationSeconds: number;
  outputPath: string;
  volume?: number;
}): Promise<void> {
  const duration = Math.max(1, Math.ceil(input.durationSeconds) + 1);
  const volume = input.volume ?? 0.09;
  await runFfmpeg([
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=110:duration=${duration}`,
    '-f', 'lavfi', '-i', `sine=frequency=164.81:duration=${duration}`,
    '-f', 'lavfi', '-i', `sine=frequency=220:duration=${duration}`,
    '-filter_complex',
    `[0:a][1:a][2:a]amix=inputs=3:normalize=0,lowpass=f=520,tremolo=f=0.15:d=0.5,volume=${volume.toFixed(3)}[out]`,
    '-map', '[out]',
    '-c:a', 'aac',
    '-b:a', '128k',
    input.outputPath,
  ]);
}
