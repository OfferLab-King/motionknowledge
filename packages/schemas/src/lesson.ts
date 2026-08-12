import {z} from 'zod';

export const LearningObjectiveV1 = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const LessonSectionV1 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objectiveIds: z.array(z.string().min(1)).default([]),
  claimIds: z.array(z.string().min(1)).default([]),
  prereqSectionIds: z.array(z.string().min(1)).default([]),
  durationSeconds: z.number().positive(),
});

export const LessonPlanV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  targetDurationSeconds: z.number().positive(),
  learningObjectives: z.array(LearningObjectiveV1).min(1),
  sections: z.array(LessonSectionV1).min(1),
  language: z.string().default('en'),
  tone: z.string().default('professional'),
});

export type LessonPlan = z.infer<typeof LessonPlanV1>;
