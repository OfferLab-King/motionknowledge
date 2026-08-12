import {
  StoryboardV1,
  type LessonPlan,
  type ResearchClaim,
  type Scene,
  type Script,
  type Storyboard,
} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import {STORYBOARD_SYSTEM, visualCatalogForPrompt, wrapUntrusted} from './prompts';

export interface GenerateStoryboardInput {
  script: Script;
  lessonPlan: LessonPlan;
  claims: ResearchClaim[];
  aspectRatio: '16:9' | '9:16';
  style: string;
}

export async function generateStoryboard(
  input: GenerateStoryboardInput,
  llm: LLMProvider,
  idempotencyKey: string,
): Promise<Storyboard> {
  const claimText = input.claims.map((claim) => `[${claim.id}] ${claim.text}`).join('\n');
  const result = await llm.generateStructured({
    operation: 'content:storyboard',
    schema: StoryboardV1,
    system: STORYBOARD_SYSTEM,
    prompt: wrapUntrusted(
      [
        `Aspect ratio: ${input.aspectRatio}`,
        `Visual style: ${input.style}`,
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
  for (const scene of storyboard.scenes) {
    for (const claimId of scene.claimIds) {
      if (!knownClaimIds.has(claimId)) throw new Error(`Scene cites unknown claim ${claimId}`);
    }
    if (scene.claimIds.length === 0) throw new Error('Scene without claim provenance');
  }
  return storyboard;
}

export function applySceneLocalEdit(scene: Scene, patch: Partial<Pick<Scene, 'title' | 'narration' | 'durationSeconds'>>): Scene {
  return {
    ...scene,
    ...patch,
    sceneVersionId: `${scene.sceneVersionId.split('-v')[0]}-v${nextVersionNumber(scene.sceneVersionId) + 1}`,
  };
}

function nextVersionNumber(sceneVersionId: string): number {
  const match = sceneVersionId.match(/-v(\d+)$/);
  return match ? Number(match[1]) : 1;
}
