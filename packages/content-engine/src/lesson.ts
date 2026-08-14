import {LessonPlanV1, type LessonPlan, type ResearchClaim} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {LESSON_SYSTEM, wrapUntrusted} from './prompts';
import {formatGrammarForPrompt, getFormat} from './formats';

export interface GenerateLessonInput {
  projectTitle: string;
  claims: ResearchClaim[];
  targetDurationSeconds: number;
  audienceLevel: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  tone: string;
  format?: string;
}

export async function generateLesson(
  input: GenerateLessonInput,
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<LessonPlan> {
  const formatId = input.format ?? 'explainer';
  const format = getFormat(formatId);
  if (!format) throw new Error(`Unknown format: ${formatId}`);
  const claimText = input.claims
    .map((claim) => `[${claim.id}] ${claim.text}`)
    .join('\n');
  const result = await llm.generateStructured({
    operation: 'content:lesson-plan',
    schema: LessonPlanV1,
    system: LESSON_SYSTEM,
    prompt: wrapUntrusted(
      [
        `Project title: ${input.projectTitle}`,
        `Audience: ${input.audienceLevel}`,
        `Target duration (seconds): ${input.targetDurationSeconds}`,
        `Language: ${input.language}`,
        `Tone: ${input.tone}`,
        formatGrammarForPrompt(formatId),
        'Available claims:',
        claimText,
        'Produce the lesson plan JSON. Order sections according to the format grammar, adapted to the content. Sections must reference claim IDs from the available claims.',
      ].join('\n'),
    ),
    idempotencyKey,
  });
  const plan = LessonPlanV1.parse(result.data);
  const knownClaimIds = new Set(input.claims.map((claim) => claim.id));
  for (const section of plan.sections) {
    for (const claimId of section.claimIds) {
      if (!knownClaimIds.has(claimId)) throw new Error(`Lesson section cites unknown claim ${claimId}`);
    }
  }
  return plan;
}
