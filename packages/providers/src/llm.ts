import type {z} from 'zod';

export interface ProviderUsage {
  inputUnits: string;
  outputUnits: string;
  providerCostUsd: string;
  computeDurationMs: number;
}

export interface ProviderResult<T> {
  data: T;
  raw: unknown;
  provider: string;
  model: string;
  usage: ProviderUsage;
  correlationId?: string;
}

export interface GenerateStructuredInput<T> {
  operation: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  idempotencyKey: string;
}

export interface LLMProvider {
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<ProviderResult<T>>;
}
