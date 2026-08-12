import {z} from 'zod';

export const HyperFrameRequestV1 = z.object({
  schemaVersion: z.literal(1),
  sceneId: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  htmlAssetKey: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[a-zA-Z0-9/._-]+$/, 'html asset key must be a safe object key'),
  variables: z.record(z.string(), z.unknown()).default({}),
  width: z.number().int().min(320).max(3840).default(1280),
  height: z.number().int().min(240).max(2160).default(720),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).default(30),
  durationSeconds: z.number().min(0.5).max(30),
  timeoutSeconds: z.number().int().min(10).max(120).default(120),
  dockerImage: z.string().min(1).default('motionknowledge-hyperframes:0.7.107'),
});

export type HyperFrameRequest = z.infer<typeof HyperFrameRequestV1>;

export const HyperFrameResultV1 = z.object({
  schemaVersion: z.literal(1),
  sceneId: z.string(),
  videoAssetKey: z.string(),
  videoSha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  durationSeconds: z.number(),
  providerCostUsd: z.string(),
  probeJson: z.string(),
});

export type HyperFrameResult = z.infer<typeof HyperFrameResultV1>;

export function assertSafeHostPath(path: string): string {
  if (path.length > 4096) throw new Error('Path too long');
  if (path.includes('\0')) throw new Error('Path contains NUL byte');
  if (path.startsWith('..') || path.includes('../')) throw new Error('Path escapes host directory');
  return path;
}
