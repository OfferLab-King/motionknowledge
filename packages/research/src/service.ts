import {ResearchDocumentV1, type ResearchClaim, type ResearchDocument, type ResearchSource, type SourceDocument} from '@motionknowledge/schemas';
import type {LLMProvider, ResearchProvider} from '@motionknowledge/providers';
import type {UsageLedger} from '@motionknowledge/usage';
import {extractClaims, type ExtractClaimsInput} from './claims';
import {sniffContent} from './ingest/sniff';
import {extractTextFromPlain} from './ingest/text';
import {extractTextFromOffice} from './ingest/office';
import {parseCsv, parseJson, structuredToText, type StructuredData} from './ingest/structured';

export interface IngestSourceInput {
  source: SourceDocument;
  bytes: Uint8Array;
  maxBytes?: number;
}

export interface IngestedSource {
  source: SourceDocument;
  text: string;
  structured?: StructuredData;
}

export async function ingestSource(input: IngestSourceInput): Promise<IngestedSource> {
  const maxBytes = input.maxBytes ?? 25_000_000;
  if (input.bytes.byteLength > maxBytes) {
    throw new Error('Source exceeds configured byte limit');
  }
  const sniff = await sniffContent(input.bytes, input.source.kind);
  if (!sniff.safe) {
    throw new Error(`Source rejected: ${sniff.reason}`);
  }
  let text: string;
  let structured: StructuredData | undefined;
  switch (input.source.kind) {
    case 'text':
    case 'file':
      text = extractTextFromPlain(input.bytes, input.source.kind).text;
      break;
    case 'csv': {
      structured = parseCsv(input.bytes);
      text = structuredToText(structured);
      break;
    }
    case 'json': {
      structured = parseJson(input.bytes, 'structured-json');
      text = structuredToText(structured);
      break;
    }
    case 'pdf':
    case 'docx':
    case 'pptx':
      text = (await extractTextFromOffice(input.bytes, input.source.kind)).text;
      break;
    default:
      throw new Error(`Unsupported source kind ${input.source.kind}`);
  }
  if (!text) throw new Error('Source contained no extractable text');
  return {source: input.source, text, structured};
}

export interface ResearchServiceOptions {
  llm: LLMProvider;
  researchProvider?: ResearchProvider;
  usage?: UsageLedger;
}

export class ResearchService {
  constructor(private readonly options: ResearchServiceOptions) {}

  async extractClaims(input: ExtractClaimsInput, idempotencyKey: string): Promise<{
    claims: ResearchClaim[];
    researchSource: ResearchSource;
  }> {
    return extractClaims(input, this.options.llm, idempotencyKey);
  }

  async research(input: {
    topic: string;
    audienceLevel: 'beginner' | 'intermediate' | 'advanced';
    maxSources?: number;
    language?: string;
    workspaceId: string;
    projectId?: string;
    correlationId?: string;
  }): Promise<{document: ResearchDocument; provider: string}> {
    if (!this.options.researchProvider) {
      const result = await this.options.llm.generateStructured({
        operation: 'research:research',
        schema: ResearchDocumentV1,
        system:
          'You are a research assistant. Produce grounded claims with real sources for the topic. ' +
          'Never fabricate URLs; only cite sources you are confident exist.',
        prompt: `Topic: ${input.topic}\nAudience: ${input.audienceLevel}\nLanguage: ${input.language ?? 'en'}`,
        idempotencyKey: input.correlationId ?? 'research-dcf',
      });
      await this.recordUsage(input, result.provider, result.model, result.usage, 'research:research');
      return {document: result.data, provider: result.provider};
    }
    const document = await this.options.researchProvider.research({
      topic: input.topic,
      audienceLevel: input.audienceLevel,
      maxSources: input.maxSources ?? 8,
      language: input.language ?? 'en',
    });
    return {document, provider: document.provider};
  }

  private async recordUsage(
    input: {workspaceId: string; projectId?: string; correlationId?: string},
    provider: string,
    model: string,
    usage: {inputUnits: string; outputUnits: string; providerCostUsd: string; computeDurationMs: number},
    operation: string,
  ): Promise<void> {
    if (!this.options.usage) return;
    await this.options.usage.record({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      provider,
      model,
      operation,
      inputUnits: usage.inputUnits,
      outputUnits: usage.outputUnits,
      providerCostUsd: usage.providerCostUsd,
      computeDurationMs: usage.computeDurationMs,
      correlationId: input.correlationId,
    });
  }
}
