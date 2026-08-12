import {describe, expect, it} from 'vitest';
import {ResearchClaimV1} from './research';
import {transitionProjectStatus} from './state';
import {stableHash} from './hash';

describe('versioned pipeline schemas', () => {
  it('rejects a claim with no source', () => {
    expect(() =>
      ResearchClaimV1.parse({
        schemaVersion: 1,
        id: 'claim-1',
        text: 'A bond price generally moves inversely to yield.',
        sourceIds: [],
        confidence: 'high',
      }),
    ).toThrow();
  });

  it('accepts a fully sourced claim', () => {
    const claim = ResearchClaimV1.parse({
      schemaVersion: 1,
      id: 'claim-1',
      text: 'A bond price generally moves inversely to yield.',
      sourceIds: ['src-1'],
      confidence: 'high',
    });
    expect(claim.sourceIds).toEqual(['src-1']);
  });
});

describe('deterministic hashing', () => {
  it('produces the same hash for reordered object keys', () => {
    expect(stableHash({b: 2, a: 1})).toBe(stableHash({a: 1, b: 2}));
  });

  it('rejects functions', () => {
    expect(() => stableHash({fn: () => 1})).toThrow();
  });
});

describe('project state machine', () => {
  it('rejects an invalid project transition', () => {
    expect(() => transitionProjectStatus('DRAFT', 'COMPLETE')).toThrow();
  });

  it('accepts a valid adjacent transition', () => {
    expect(transitionProjectStatus('DRAFT', 'RESEARCHING')).toBe('RESEARCHING');
  });
});
