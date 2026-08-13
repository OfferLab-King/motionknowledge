import {z} from 'zod';

export const ResearchSourceV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  url: z.string().url().nullable(),
  title: z.string().min(1),
  provider: z.string().min(1),
  retrievedAt: z.string().datetime(),
  license: z.string().default('link-only'),
  attribution: z.string().nullable().default(null),
});

export const ResearchClaimV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  text: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1, 'A claim must cite at least one source'),
  confidence: z.enum(['low', 'medium', 'high']),
  category: z.string().default('fact'),
});

export const ResearchDocumentV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  sources: z.array(ResearchSourceV1).default([]),
  claims: z.array(ResearchClaimV1).default([]),
  generatedAt: z.string().datetime(),
  provider: z.string().min(1),
});

export type ResearchSource = z.infer<typeof ResearchSourceV1>;
export type ResearchClaim = z.infer<typeof ResearchClaimV1>;
export type ResearchDocument = z.infer<typeof ResearchDocumentV1>;
