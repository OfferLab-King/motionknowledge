import {z} from 'zod';

export {ThemeTokenSchema} from './style';

const TitleHeroDataV1 = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(''),
});

const CashflowTimelineDataV1 = z.object({
  title: z.string().default(''),
  periods: z.array(
    z.object({
      year: z.number().int(),
      label: z.string(),
      amount: z.number(),
      displayAmount: z.string(),
      type: z.enum(['inflow', 'outflow']).default('inflow'),
    }),
  ).min(1),
});

const FormulaDataV1 = z.object({
  title: z.string().default(''),
  formula: z.string().min(1),
  description: z.string().default(''),
});

const ComparisonDataV1 = z.object({
  title: z.string().default(''),
  items: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
    }),
  ).min(2),
});

const CatalogDataV1 = z.object({
  visualId: z.string().min(1),
  title: z.string().default(''),
  data: z.unknown(),
});

const HyperframesDataV1 = z.object({
  title: z.string().default(''),
  htmlAssetKey: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).default({}),
});

export const TitleHeroInstructionV1 = z.object({
  type: z.literal('title-hero'),
  schemaVersion: z.literal(1),
  intent: z.string().default('introduce'),
  data: TitleHeroDataV1,
});

export const CashflowTimelineInstructionV1 = z.object({
  type: z.literal('cashflow-timeline'),
  schemaVersion: z.literal(1),
  intent: z.string().default('explain'),
  data: CashflowTimelineDataV1,
});

export const FormulaInstructionV1 = z.object({
  type: z.literal('formula'),
  schemaVersion: z.literal(1),
  intent: z.string().default('define'),
  data: FormulaDataV1,
});

export const ComparisonInstructionV1 = z.object({
  type: z.literal('comparison'),
  schemaVersion: z.literal(1),
  intent: z.string().default('compare'),
  data: ComparisonDataV1,
});

export const CatalogInstructionV1 = z.object({
  type: z.literal('catalog'),
  schemaVersion: z.literal(1),
  intent: z.string().default('show'),
  data: CatalogDataV1,
});

export const HyperframesInstructionV1 = z.object({
  type: z.literal('hyperframes'),
  schemaVersion: z.literal(1),
  intent: z.string().default('animate'),
  data: HyperframesDataV1,
});

export const VisualInstructionV1 = z.discriminatedUnion('type', [
  TitleHeroInstructionV1,
  CashflowTimelineInstructionV1,
  FormulaInstructionV1,
  ComparisonInstructionV1,
  CatalogInstructionV1,
  HyperframesInstructionV1,
]);

export type VisualInstruction = z.infer<typeof VisualInstructionV1>;
