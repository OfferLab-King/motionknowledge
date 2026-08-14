import {
  StoryboardV1,
  type LessonPlan,
  type ResearchClaim,
  type Scene,
  type Script,
  type Storyboard,
} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {repairCatalogVisualData} from './neutral';
import {STORYBOARD_SYSTEM, visualCatalogForPrompt, visualStyleForPrompt, templateGuidanceForPrompt, wrapUntrusted} from './prompts';
import {formatGrammarForPrompt, getFormat} from './formats';
import {getTemplate} from './templates';
import {getStyleDefinition} from '@motionknowledge/visual-library/style';

export interface GenerateStoryboardInput {
  script: Script;
  lessonPlan: LessonPlan;
  claims: ResearchClaim[];
  aspectRatio: '16:9' | '9:16';
  format: string;
  templateId: string | null;
  styleId: string;
  language?: string;
}

export async function generateStoryboard(
  input: GenerateStoryboardInput,
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<Storyboard> {
  const claimText = input.claims.map((claim) => `[${claim.id}] ${claim.text}`).join('\n');
  const format = getFormat(input.format);
  if (!format) throw new Error(`Unknown format: ${input.format}`);
  const template = input.templateId ? getTemplate(input.templateId) : undefined;
  const style = getStyleDefinition(input.styleId);
  if (!style) throw new Error(`Unknown style: ${input.styleId}`);
  const result = await llm.generateStructured({
    operation: 'content:storyboard',
    schema: StoryboardV1,
    system: STORYBOARD_SYSTEM,
    prompt: wrapUntrusted(
      [
        `Aspect ratio: ${input.aspectRatio}`,
        `Language: ${input.language ?? 'en'}`,
        visualStyleForPrompt(style.id, style.name, style.description),
        formatGrammarForPrompt(input.format),
        templateGuidanceForPrompt(template?.id ?? null, template?.name ?? null, template?.scenePlanningGuidance ?? ''),
        'Compact visual catalog (id: purpose):',
        visualCatalogForPrompt(),
        'Script chapters:',
        input.script.chapters
          .map((chapter) => `## ${chapter.title}\n${chapter.segments.map((segment) => `[${segment.id}] ${segment.text}`).join('\n')}`)
          .join('\n'),
        'Available claims:',
        claimText,
        'Produce the storyboard JSON. One scene per narration beat, each scene with a visual from the catalog, narration text, and claim IDs.',
      ].join('\n'),
    ),
    idempotencyKey,
  });
  const storyboard = StoryboardV1.parse(result.data);
  const knownClaimIds = new Set(input.claims.map((claim) => claim.id));
  // Derive claims for scenes that omitted them: a scene's narration belongs to
  // a script chapter, whose segments were claim-validated upstream. This keeps
  // traceability while tolerating model output that skips the claim list.
  const chapterClaims = new Map<string, string[]>();
  for (const chapter of input.script.chapters) {
    chapterClaims.set(chapter.id, [...new Set(chapter.segments.flatMap((segment) => segment.claimIds))]);
  }
  const chapterText = new Map<string, string>();
  for (const chapter of input.script.chapters) {
    chapterText.set(chapter.id, chapter.segments.map((segment) => segment.text).join(' ').toLowerCase());
  }
  for (const scene of storyboard.scenes) {
    for (const claimId of scene.claimIds) {
      if (!knownClaimIds.has(claimId)) throw new Error(`Scene cites unknown claim ${claimId}`);
    }
    if (scene.claimIds.length === 0) {
      let chapterId = scene.chapterId;
      if (!chapterClaims.has(chapterId)) {
        // The model sometimes invents chapter ids; match the narration to the
        // script chapter with the strongest word overlap instead of failing.
        chapterId = bestMatchingChapter(scene.narration, chapterText) ?? chapterId;
      }
      const derived = chapterClaims.get(chapterId) ?? [];
      if (derived.length === 0) throw new Error('Scene without claim provenance');
      scene.claimIds = derived;
    }
    repairCatalogVisualData(scene);
  }
  // Presentation identity is deterministic: the chosen format/template/style
  // wins over anything the model emitted.
  return {
    ...storyboard,
    format: input.format,
    templateId: input.templateId ?? null,
    styleId: input.styleId,
  };
}

export {repairCatalogVisualData} from './neutral';

/**
 * Pick the script chapter whose text shares the most vocabulary with the
 * scene narration. Used to ground scenes whose model-supplied chapter id does
 * not exist in the script.
 */
export function bestMatchingChapter(narration: string, chapterText: ReadonlyMap<string, string>): string | null {
  const narrationWords = new Set(narration.toLowerCase().split(/[^a-z0-9']+/).filter((word) => word.length > 2));
  if (narrationWords.size === 0) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const [chapterId, text] of chapterText) {
    const chapterWords = new Set(text.split(/[^a-z0-9']+/).filter((word) => word.length > 2));
    let overlap = 0;
    for (const word of narrationWords) {
      if (chapterWords.has(word)) overlap += 1;
    }
    const score = overlap / narrationWords.size;
    if (score > bestScore) {
      bestScore = score;
      best = chapterId;
    }
  }
  // A meaningful overlap is required; otherwise the scene is genuinely
  // ungroundable and the caller should fail.
  return bestScore >= 0.15 ? best : null;
}

export function applySceneLocalEdit(scene: Scene, patch: Partial<Pick<Scene, 'title' | 'narration' | 'durationSeconds'>>): Scene {  return {
    ...scene,
    ...patch,
    sceneVersionId: `${scene.sceneVersionId.split('-v')[0]}-v${nextVersionNumber(scene.sceneVersionId) + 1}`,
  };
}

function nextVersionNumber(sceneVersionId: string): number {
  const match = sceneVersionId.match(/-v(\d+)$/);
  return match ? Number(match[1]) : 1;
}
