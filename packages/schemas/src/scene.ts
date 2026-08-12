import {z} from 'zod';
import {VisualInstructionV1} from './visual';
import {ThemeTokenSchema} from './visual';
import {ProviderInfoSchema} from './common';

export const SceneV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  sceneVersionId: z.string().min(1),
  index: z.number().int().nonnegative(),
  title: z.string().min(1),
  narration: z.string().min(1),
  durationSeconds: z.number().positive(),
  claimIds: z.array(z.string().min(1)).default([]),
  chapterId: z.string().min(1),
  visual: VisualInstructionV1,
  provider: ProviderInfoSchema,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const StoryboardV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  scenes: z.array(SceneV1).min(1),
  theme: ThemeTokenSchema,
});

export type Scene = z.infer<typeof SceneV1>;
export type Storyboard = z.infer<typeof StoryboardV1>;
