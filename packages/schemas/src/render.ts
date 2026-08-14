import {z} from 'zod';
import {ThemeTokenSchema, StyleIdentitySchema, StyleOverrideSchema} from './style';
import {Sha256Schema} from './common';

export const RenderSceneV1 = z.object({
  sceneVersionId: z.string().min(1),
  sceneId: z.string().min(1),
  title: z.string().min(1),
  index: z.number().int().nonnegative(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  fps: z.number().positive(),
  narrationAudioKey: z.string().nullable(),
  narrationStartMs: z.number().nonnegative().default(0),
  captionSegments: z.array(
    z.object({
      startMs: z.number().nonnegative(),
      endMs: z.number().nonnegative(),
      text: z.string().min(1),
    }),
  ).default([]),
  visual: z.unknown(),
  styleOverride: StyleOverrideSchema.default({}),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const RenderManifestV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.literal(30),
  totalDurationInFrames: z.number().int().positive(),
  theme: ThemeTokenSchema,
  style: StyleIdentitySchema.default({styleId: 'signature', styleVersion: 1}),
  scenes: z.array(RenderSceneV1).min(1),
  audioTracks: z.array(
    z.object({
      key: z.string().min(1),
      sceneVersionId: z.string().min(1),
      offsetMs: z.number().nonnegative(),
    }),
  ).default([]),
  musicTrackKey: z.string().nullable().default(null),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const RenderResultV1 = z.object({
  schemaVersion: z.literal(1),
  renderId: z.string().min(1),
  mp4Key: z.string().min(1),
  mp4Sha256: Sha256Schema,
  srtKey: z.string().min(1),
  transcriptKey: z.string().min(1),
  thumbnailKey: z.string().min(1),
  chaptersKey: z.string().min(1),
  metadataKey: z.string().min(1),
  durationSeconds: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  videoCodec: z.string().min(1),
  audioCodec: z.string().min(1),
  outputFps: z.number().positive(),
  providerCostUsd: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

export const QACheckV1 = z.object({
  code: z.string().min(1),
  critical: z.boolean(),
  passed: z.boolean(),
  message: z.string().default(''),
});

export const QAResultV1 = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  renderId: z.string().nullable().default(null),
  checks: z.array(QACheckV1),
  passed: z.boolean(),
  evaluatedAt: z.string().datetime(),
});

export const YouTubeMetadataV1 = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  category: z.string().default('Education'),
});

export type RenderManifest = z.infer<typeof RenderManifestV1>;
export type RenderScene = z.infer<typeof RenderSceneV1>;
export type RenderResult = z.infer<typeof RenderResultV1>;
export type QAResult = z.infer<typeof QAResultV1>;
export type YouTubeMetadata = z.infer<typeof YouTubeMetadataV1>;
