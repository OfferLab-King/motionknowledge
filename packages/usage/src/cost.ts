import {z} from 'zod';

export const MoneySchema = z.string().regex(/^\d+(\.\d{1,6})?$/, 'Money must be a decimal string');

export interface UsageCalculation {
  internalCostUsd: string;
  customerCredits: number;
}

export function calculateUsage(input: {
  providerCostUsd: string;
  customerCredits: number;
}): UsageCalculation {
  MoneySchema.parse(input.providerCostUsd);
  if (!Number.isInteger(input.customerCredits) || input.customerCredits < 0) {
    throw new Error('Customer credits must be a non-negative integer');
  }
  return {
    internalCostUsd: input.providerCostUsd,
    customerCredits: input.customerCredits,
  };
}

export function sumMoneyUsd(values: string[]): string {
  const total = values.reduce((sum, value) => {
    MoneySchema.parse(value);
    return sum + Number(value);
  }, 0);
  return total.toFixed(6).replace(/\.?0+$/, '') === ''
    ? '0'
    : String(total);
}
