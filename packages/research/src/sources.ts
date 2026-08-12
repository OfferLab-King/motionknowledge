import {z} from 'zod';

export const ResearchSourceRecordV1 = z.object({
  id: z.string().min(1),
  url: z.string().url().nullable(),
  title: z.string().min(1),
  provider: z.string().min(1),
  retrievedAt: z.string().datetime(),
  license: z.string().default('link-only'),
  attribution: z.string().nullable().default(null),
});

export const SourceRecordV1 = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(['url', 'text', 'pdf', 'docx', 'pptx', 'csv', 'json', 'file']),
  rawSha256: z.string(),
  normalizedSha256: z.string(),
  originalUrl: z.string().url().nullable(),
  fetchedAt: z.string().datetime().nullable(),
  language: z.string().default('en'),
  byteCount: z.number().nonnegative(),
  supplied: z.boolean().default(true),
  status: z.enum(['PENDING', 'PROCESSED', 'FAILED']).default('PROCESSED'),
});

export function rejectFabricatedCitations(claims: Array<{sourceIds: string[]}>, knownSourceIds: Set<string>): void {
  for (const claim of claims) {
    for (const sourceId of claim.sourceIds) {
      if (!knownSourceIds.has(sourceId)) {
        throw new Error(`Claim cites unknown source ${sourceId}`);
      }
    }
  }
}
