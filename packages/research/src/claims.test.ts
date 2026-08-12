import {describe, expect, it} from 'vitest';
import {ResearchService} from './service';
import {MockProvider, type LLMProvider} from '@motionknowledge/providers';
import type {SourceDocument} from '@motionknowledge/schemas';

const sourceDocument: SourceDocument = {
  schemaVersion: 1,
  id: 'c9a1f8e0-0000-0000-0000-000000000001',
  projectId: 'c9a1f8e0-0000-0000-0000-000000000002',
  supplied: true,
  kind: 'text',
  title: 'Discounted cash flow primer',
  rawSha256: 'a'.repeat(64),
  normalizedSha256: 'b'.repeat(64),
  originalUrl: null,
  fetchedAt: null,
  language: 'en',
  byteCount: 1200,
  status: 'PROCESSED',
  failureReason: null,
};

describe('claim provenance', () => {
  it('keeps claim-to-source links after normalization', async () => {
    const service = new ResearchService({llm: new MockProvider()});
    const {claims} = await service.extractClaims(
      {source: sourceDocument, text: 'A DCF estimates the value of an investment from its expected future cash flows.'},
      'claims-test-1',
    );
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((claim) => claim.sourceIds.length > 0)).toBe(true);
    expect(claims.every((claim) => claim.text.length > 10)).toBe(true);
  });

  it('rejects claims that cite unknown sources', async () => {
    const service = new ResearchService({
      llm: {
        async generateStructured<T>(input: Parameters<LLMProvider['generateStructured']>[0]) {
          return {
            data: {
              schemaVersion: 1,
              id: 'doc-1',
              sources: [],
              claims: [{schemaVersion: 1, id: 'c1', text: 'Fabricated claim', sourceIds: ['no-such-source'], confidence: 'high', category: 'fact'}],
              generatedAt: new Date().toISOString(),
              provider: 'mock',
            } as T,
            raw: {},
            provider: 'mock',
            model: 'mock',
            usage: {inputUnits: '0', outputUnits: '0', providerCostUsd: '0', computeDurationMs: 1},
          };
        },
      },
    });
    await expect(
      service.extractClaims({source: sourceDocument, text: 'irrelevant'}, 'claims-test-2'),
    ).rejects.toThrow('Claim cites unknown source');
  });
});
