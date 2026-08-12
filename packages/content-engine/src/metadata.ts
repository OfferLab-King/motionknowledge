import {YouTubeMetadataV1, type YouTubeMetadata} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {METADATA_SYSTEM, wrapUntrusted} from './prompts';

export async function generateYouTubeMetadata(
  input: {
    projectTitle: string;
    scriptPreview: string;
    transcriptPreview: string;
  },
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<YouTubeMetadata> {
  const result = await llm.generateStructured({
    operation: 'content:metadata',
    schema: YouTubeMetadataV1,
    system: METADATA_SYSTEM,
    prompt: wrapUntrusted(
      [
        `Project title: ${input.projectTitle}`,
        `Script preview:\n${input.scriptPreview.slice(0, 2000)}`,
        `Transcript preview:\n${input.transcriptPreview.slice(0, 2000)}`,
      ].join('\n'),
    ),
    idempotencyKey,
  });
  return YouTubeMetadataV1.parse(result.data);
}
