import {ScriptV1, type LessonPlan, type ResearchClaim, type Script} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {SCRIPT_SYSTEM, wrapUntrusted} from './prompts';

export interface GenerateScriptInput {
  lessonPlan: LessonPlan;
  claims: ResearchClaim[];
  language: string;
  tone: string;
}

export async function generateScript(
  input: GenerateScriptInput,
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<Script> {
  const claimText = input.claims.map((claim) => `[${claim.id}] ${claim.text}`).join('\n');
  const sectionText = input.lessonPlan.sections
    .map((section) => `- ${section.id}: ${section.title} (claims: ${section.claimIds.join(', ') || 'none'}, ${section.durationSeconds}s)`)
    .join('\n');
  const result = await llm.generateStructured({
    operation: 'content:script',
    schema: ScriptV1,
    system: SCRIPT_SYSTEM,
    prompt: wrapUntrusted(
      [
        `Video title: ${input.lessonPlan.title}`,
        `Language: ${input.language}`,
        `Tone: ${input.tone}`,
        'Lesson sections:',
        sectionText,
        'Available claims:',
        claimText,
        'Produce the script JSON. Every segment must cite claim IDs from the available claims.',
      ].join('\n'),
    ),
    idempotencyKey,
  });
  const script = ScriptV1.parse(result.data);
  const knownClaimIds = new Set(input.claims.map((claim) => claim.id));
  for (const chapter of script.chapters) {
    for (const segment of chapter.segments) {
      if (segment.claimIds.length === 0) {
        throw new Error('Script segment without claim provenance');
      }
      for (const claimId of segment.claimIds) {
        if (!knownClaimIds.has(claimId)) throw new Error(`Script segment cites unknown claim ${claimId}`);
      }
    }
  }
  return script;
}
