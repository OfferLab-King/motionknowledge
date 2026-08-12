import {z} from 'zod';
import {UuidSchema} from './common';

export const SourceDocumentV1 = z.object({
  schemaVersion: z.literal(1),
  id: UuidSchema,
  projectId: UuidSchema,
  supplied: z.boolean().default(true),
  kind: z.enum(['url', 'text', 'pdf', 'docx', 'pptx', 'csv', 'json', 'file']),
  title: z.string().min(1),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  originalUrl: z.string().url().nullable(),
  fetchedAt: z.string().datetime().nullable(),
  language: z.string().default('en'),
  byteCount: z.number().nonnegative(),
  status: z.enum(['PENDING', 'PROCESSED', 'FAILED']).default('PENDING'),
  failureReason: z.string().nullable().default(null),
});

export type SourceDocument = z.infer<typeof SourceDocumentV1>;
