import {z} from 'zod';
import {PROJECT_STATUSES, ProjectStatusSchema} from './state';

export const VideoProjectV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  targetDurationSeconds: z.number().positive(),
  language: z.string().default('en'),
  tone: z.string().default('professional'),
  style: z.string().default('professional'),
  format: z.string().default('explainer'),
  templateId: z.string().nullable().default(null),
  styleId: z.string().default('signature'),
  styleVersion: z.number().int().positive().default(1),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  status: ProjectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  latestPreviewRenderId: z.string().nullable().default(null),
  latestRenderResultId: z.string().nullable().default(null),
});

export type VideoProject = z.infer<typeof VideoProjectV1>;

export const ProjectStatusList = PROJECT_STATUSES;
