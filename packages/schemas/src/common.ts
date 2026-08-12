import {z} from 'zod';

export const UuidSchema = z.string().uuid();
export const NonEmptyString = z.string().min(1);
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const IsoDateSchema = z.string().datetime();
export const MoneySchema = z.string().regex(/^\d+(\.\d{1,6})?$/);

export const JsonValueSchema = z.unknown();

export const ProviderInfoSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  costUsd: MoneySchema.default('0'),
  durationMs: z.number().nonnegative().default(0),
});

export const ProvenanceSchema = z.object({
  origin: z.enum(['supplied', 'research', 'generated', 'stock', 'licensed', 'derived']),
  sourceUrl: z.string().url().nullable(),
  license: z.string().min(1),
  attribution: z.string().nullable(),
  sha256: Sha256Schema.nullable(),
});
