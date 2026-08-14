import {z} from 'zod';
import {VisualInstructionV1} from './visual';
import {StyleOverrideSchema} from './style';
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
  styleOverride: StyleOverrideSchema.default({}),
  provider: ProviderInfoSchema,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const StoryboardV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  scenes: z.array(SceneV1).min(1),
  // Deprecated legacy field: rendering tokens now come from the style registry
  // via styleId. Kept optional so persisted storyboards still parse.
  theme: z.unknown().optional(),
  format: z.string().default('explainer'),
  templateId: z.string().nullable().default(null),
  styleId: z.string().default('signature'),
});

export type Scene = z.infer<typeof SceneV1>;
export type Storyboard = z.infer<typeof StoryboardV1>;
