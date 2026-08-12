import {describe, expect, it} from 'vitest';
import {MockProvider} from './mock';
import {ResearchDocumentV1, LessonPlanV1} from '@motionknowledge/schemas';
import type {z} from 'zod';

describe('provider contract normalization', () => {
  it('mock provider emits valid, source-grounded research documents', async () => {
    const provider = new MockProvider();
    const result = await provider.generateStructured({
      operation: 'research:extract-claims',
      schema: ResearchDocumentV1,
      system: 'extract claims',
      prompt: 'untrusted: DCF definition',
      idempotencyKey: 'contract-test-1',
    });
    const doc = ResearchDocumentV1.parse(result.data);
    expect(result.provider).toBe('mock');
    expect(result.usage.providerCostUsd).toBe('0');
    for (const claim of doc.claims) {
      expect(claim.sourceIds.length).toBeGreaterThan(0);
      const known = new Set(doc.sources.map((s) => s.id));
      expect(claim.sourceIds.every((id) => known.has(id))).toBe(true);
    }
  });

  it('mock provider returns deterministic lesson plans for the DCF workflow', async () => {
    const provider = new MockProvider();
    const result = await provider.generateStructured({
      operation: 'content:lesson-plan',
      schema: LessonPlanV1,
      system: 'lesson planning',
      prompt: 'What is a Discounted Cash Flow?',
      idempotencyKey: 'contract-test-2',
    });
    expect(result.data.title).toBe('What is a Discounted Cash Flow?');
    expect(result.data.sections.length).toBeGreaterThanOrEqual(5);
  });
});
