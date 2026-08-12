import {z} from 'zod';

export const ScriptSegmentV1 = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  text: z.string().min(1),
  claimIds: z.array(z.string().min(1)).min(1, 'Every script segment must cite claims'),
  sectionId: z.string().min(1),
});

export const ChapterV1 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  segments: z.array(ScriptSegmentV1).min(1),
  sectionId: z.string().min(1),
});

export const ScriptV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  chapters: z.array(ChapterV1).min(1),
  language: z.string().default('en'),
  tone: z.string().default('professional'),
});

export type Chapter = z.infer<typeof ChapterV1>;
export type Script = z.infer<typeof ScriptV1>;
