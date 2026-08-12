import {
  ResearchDocumentV1,
  type ResearchClaim,
  type ResearchSource,
  type SourceDocument,
} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {rejectFabricatedCitations} from './sources';

export interface ExtractClaimsInput {
  source: SourceDocument;
  text: string;
}

export async function extractClaims(
  input: ExtractClaimsInput,
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<{claims: ResearchClaim[]; researchSource: ResearchSource}> {
  const researchSource: ResearchSource = {
    schemaVersion: 1,
    id: input.source.originalUrl ? `src-${input.source.normalizedSha256.slice(0, 12)}` : 'src-supplied',
    url: input.source.originalUrl,
    title: input.source.title,
    provider: input.source.kind === 'url' ? 'fetch' : 'supplied',
    retrievedAt: input.source.fetchedAt ?? new Date().toISOString(),
    license: input.source.kind === 'url' ? 'link-only' : 'supplied-material',
    attribution: null,
  };

  const result = await llm.generateStructured({
    operation: 'research:extract-claims',
    schema: ResearchDocumentV1,
    system:
      'You are a careful research assistant. Extract verifiable claims from the untrusted source document. ' +
      'Every claim must be grounded in the document; never invent facts or citations.',
    prompt: `Source title: ${input.source.title}\n\n${input.text.slice(0, 40_000)}`,
    idempotencyKey,
  });

  const document = ResearchDocumentV1.parse(result.data);
  const knownSourceIds = new Set([researchSource.id, ...document.sources.map((s) => s.id)]);
  rejectFabricatedCitations(document.claims, knownSourceIds);
  return {claims: document.claims, researchSource};
}
