import type {QAResult, RenderManifest} from '@motionknowledge/schemas';
import {QACheckV1} from '@motionknowledge/schemas';
import type {MediaProbe} from './probe';

export interface RenderQaContext {
  expectedFps: number;
}

export function evaluateRenderQa(
  manifest: RenderManifest,
  probe: MediaProbe,
  audioLevels: {maxVolumeDb: number; meanVolumeDb: number},
): QAResult {
  const checks = [];

  checks.push(
    QACheckV1.parse({
      code: 'DURATION',
      critical: true,
      passed:
        Math.abs(probe.durationSeconds - manifest.totalDurationInFrames / manifest.fps) < 1.5,
      message: `expected ${(manifest.totalDurationInFrames / manifest.fps).toFixed(2)}s, measured ${probe.durationSeconds.toFixed(2)}s`,
    }),
  );

  checks.push(
    QACheckV1.parse({
      code: 'VIDEO_STREAM',
      critical: true,
      passed: probe.hasVideo,
      message: probe.hasVideo ? 'video stream present' : 'video stream missing',
    }),
  );

  checks.push(
    QACheckV1.parse({
      code: 'DIMENSIONS',
      critical: true,
      passed: probe.width === manifest.width && probe.height === manifest.height,
      message: `expected ${manifest.width}x${manifest.height}, measured ${probe.width}x${probe.height}`,
    }),
  );

  checks.push(
    QACheckV1.parse({
      code: 'VIDEO_CODEC',
      critical: true,
      passed: probe.videoCodec === 'h264',
      message: `codec ${probe.videoCodec}`,
    }),
  );

  checks.push(
    QACheckV1.parse({
      code: 'FPS',
      critical: false,
      passed: probe.fps > 0 && Math.abs(probe.fps - manifest.fps) <= 1.5,
      message: `fps ${probe.fps.toFixed(2)}`,
    }),
  );

  checks.push(
    QACheckV1.parse({
      code: 'AUDIO_STREAM',
      critical: manifest.audioTracks.length > 0,
      passed: manifest.audioTracks.length === 0 || probe.hasAudio,
      message: manifest.audioTracks.length === 0
        ? 'no narration expected'
        : probe.hasAudio ? 'audio stream present' : 'audio stream missing',
    }),
  );

  if (manifest.audioTracks.length > 0) {
    checks.push(
      QACheckV1.parse({
        code: 'AUDIO_NOT_SILENT',
        critical: true,
        passed: audioLevels.maxVolumeDb > -40,
        message: `max volume ${audioLevels.maxVolumeDb.toFixed(1)} dB`,
      }),
    );
    checks.push(
      QACheckV1.parse({
        code: 'AUDIO_NOT_CLIPPED',
        critical: false,
        passed: audioLevels.maxVolumeDb < 0,
        message: `max volume ${audioLevels.maxVolumeDb.toFixed(1)} dB`,
      }),
    );
  }

  checks.push(
    QACheckV1.parse({
      code: 'SCENE_MANIFEST',
      critical: true,
      passed: manifest.scenes.length > 0 && manifest.totalDurationInFrames > 0,
      message: `${manifest.scenes.length} scenes`,
    }),
  );

  const failedCritical = checks.some((check) => check.critical && !check.passed);
  return {
    schemaVersion: 1,
    projectId: manifest.projectId,
    renderId: null,
    checks,
    passed: !failedCritical,
    evaluatedAt: new Date().toISOString(),
  };
}
