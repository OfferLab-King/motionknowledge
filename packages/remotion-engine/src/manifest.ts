import type {CaptionSegment, RenderManifest, Scene, TimedWord} from '@motionknowledge/schemas';
import {groupCaptions} from '@motionknowledge/captions';
import {resolveTheme} from '@motionknowledge/visual-library/style';

export function groupSceneCaptions(wordTimings: TimedWord[]): Array<{startMs: number; endMs: number; text: string}> {
  return groupCaptions(wordTimings, {maxWords: 7, maxDurationMs: 3200, maxCharsPerLine: 80}).map((group) => ({
    startMs: group.startMs,
    endMs: group.endMs,
    text: group.text,
  }));
}

export interface RenderManifestInput {
  title: string;
  projectId: string;
  sceneVersions: Scene[];
  audioByScene: Map<string, {wordTimings: TimedWord[]; assetKey: string}>;
  width: number;
  height: number;
  fps: 30;
  styleId?: string;
  styleVersion?: number;
  burnedCaptions?: boolean;
  audioUrlFor?: (assetKey: string) => string | null;
}

export function buildRenderManifest(input: RenderManifestInput): RenderManifest {
  const fps = input.fps;
  let cursor = 0;
  const styleId = input.styleId ?? 'signature';
  const styleVersion = input.styleVersion ?? 1;
  const theme = resolveTheme(styleId);
  const renderScenes = input.sceneVersions.map((scene) => {
    const audio = input.audioByScene.get(scene.id);
    const lastWordEndMs = audio && audio.wordTimings.length > 0 ? audio.wordTimings.at(-1)!.endMs : 0;
    const narrationSeconds = lastWordEndMs > 0 ? Math.ceil(lastWordEndMs / 1000) + 1 : 0;
    const durationSeconds = Math.max(scene.durationSeconds, narrationSeconds + 1);
    const durationInFrames = Math.round(durationSeconds * fps);
    const startFrame = cursor;
    cursor += durationInFrames;
    const captionSegments = audio && audio.wordTimings.length > 0 ? groupSceneCaptions(audio.wordTimings) : [];
    return {
      sceneVersionId: scene.sceneVersionId,
      sceneId: scene.id,
      title: scene.title,
      index: scene.index,
      chapterId: scene.chapterId,
      startFrame,
      durationInFrames,
      fps,
      narrationAudioKey: audio?.assetKey ?? null,
      narrationStartMs: 0,
      captionSegments,
      visual: scene.visual,
      styleOverride: scene.styleOverride ?? {},
      inputHash: scene.inputHash,
    };
  });
  const manifest: RenderManifest = {
    schemaVersion: 1,
    id: `manifest-${input.projectId}`,
    projectId: input.projectId,
    title: input.title,
    width: input.width,
    height: input.height,
    fps,
    totalDurationInFrames: cursor,
    theme,
    style: {styleId, styleVersion},
    burnedCaptions: input.burnedCaptions ?? true,
    scenes: renderScenes,
    audioTracks: renderScenes
      .filter((scene) => scene.narrationAudioKey)
      .map((scene) => ({
        key: scene.narrationAudioKey!,
        sceneVersionId: scene.sceneVersionId,
        offsetMs: Math.round((scene.startFrame / fps) * 1000),
      })),
    musicTrackKey: null,
    inputHash: '0'.repeat(64),
  };
  if (input.audioUrlFor) {
    const urlMap = new Map<string, string | null>();
    for (const track of manifest.audioTracks) {
      if (!urlMap.has(track.key)) urlMap.set(track.key, input.audioUrlFor(track.key));
    }
    (manifest as RenderManifest & {audioUrls?: Record<string, string | null>}).audioUrls = Object.fromEntries(urlMap);
  }
  return manifest;
}

export function buildCaptionTrack(projectId: string, scenesWithCaptions: Array<{sceneId: string; segments: CaptionSegment[]}>): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let index = 0;
  for (const item of scenesWithCaptions) {
    for (const segment of item.segments) {
      segments.push({...segment, sceneId: item.sceneId, index: index++});
    }
  }
  return segments;
}
