import {describe, expect, it} from 'vitest';
import {calculateUsage, sumMoneyUsd} from './cost';

describe('usage cost accounting', () => {
  it('keeps cost separate from credits', () => {
    expect(calculateUsage({providerCostUsd: '0.42', customerCredits: 12})).toEqual({
      internalCostUsd: '0.42',
      customerCredits: 12,
    });
  });

  it('rejects malformed money strings', () => {
    expect(() => calculateUsage({providerCostUsd: '0,42', customerCredits: 1})).toThrow();
    expect(() => sumMoneyUsd(['0.1', 'nope'])).toThrow();
  });

  it('sums decimal money without floating point drift', () => {
    expect(sumMoneyUsd(['0.1', '0.2', '0.7'])).toBe('1');
  });
});
