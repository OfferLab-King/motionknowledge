import {z} from 'zod';
import {Sha256Schema} from './common';

export const TimedWordV1 = z.object({
  text: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).nullable(),
});

export const CaptionSegmentV1 = z.object({
  schemaVersion: z.literal(1),
  sceneId: z.string().min(1),
  index: z.number().int().nonnegative(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  text: z.string().min(1),
  words: z.array(TimedWordV1).default([]),
});

export const TTSManifestV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  sampleRateHz: z.number().positive(),
  scenes: z.array(
    z.object({
      sceneId: z.string().min(1),
      sceneVersionId: z.string().min(1),
      audioAssetKey: z.string().min(1),
      audioSha256: Sha256Schema,
      wordTimings: z.array(TimedWordV1),
      durationMs: z.number().positive(),
      inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ).min(1),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const CaptionTrackV1 = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  segments: z.array(CaptionSegmentV1),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type TimedWord = z.infer<typeof TimedWordV1>;
export type CaptionSegment = z.infer<typeof CaptionSegmentV1>;
export type TTSManifest = z.infer<typeof TTSManifestV1>;
