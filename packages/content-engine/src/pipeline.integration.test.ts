import {describe, expect, it} from 'vitest';
import {ContentPipeline} from './pipeline';
import {MockProvider, dcfClaims} from '@motionknowledge/providers';
import type {LLMProvider, ProviderResult} from '@motionknowledge/providers';
import {LessonPlanV1} from '@motionknowledge/schemas';

const claims = dcfClaims();

describe('content pipeline traceability', () => {
  it('keeps script paragraphs traceable to research claims', async () => {
    const pipeline = new ContentPipeline({llm: new MockProvider()});
    const lessonPlan = LessonPlanV1.parse({
      schemaVersion: 1,
      id: 'lesson-mock',
      title: 'What is a Discounted Cash Flow?',
      audienceLevel: 'beginner',
      targetDurationSeconds: 300,
      learningObjectives: [{id: 'obj-1', text: 'Explain time value of money'}],
      sections: [
        {
          id: 'sec-1',
          title: 'Introduction',
          objectiveIds: ['obj-1'],
          claimIds: ['claim-dcf-definition'],
          prereqSectionIds: [],
          durationSeconds: 60,
        },
      ],
      language: 'en',
      tone: 'professional',
    });
    const result = await pipeline.generateScript(lessonPlan, claims);
    expect(
      result.chapters.flatMap((chapter) => chapter.segments).every((segment) => segment.claimIds.length > 0),
    ).toBe(true);
  });

  it('keeps storyboard scenes traceable to claims', async () => {
    const pipeline = new ContentPipeline({llm: new MockProvider()});
    const storyboard = await pipeline.generateStoryboard(
      {
        script: {
          schemaVersion: 1,
          id: 'script-mock',
          title: 'DCF',
          language: 'en',
          tone: 'professional',
          chapters: [
            {
              id: 'chapter-1',
              title: 'Intro',
              sectionId: 'sec-1',
              segments: [
                {id: 's1', chapterId: 'chapter-1', sectionId: 'sec-1', text: 'What is DCF?', claimIds: ['claim-dcf-definition']},
              ],
            },
          ],
        },
        lessonPlan: LessonPlanV1.parse({
          schemaVersion: 1,
          id: 'lesson-2',
          title: 'DCF',
          audienceLevel: 'beginner',
          targetDurationSeconds: 300,
          learningObjectives: [{id: 'obj-1', text: 'Explain DCF'}],
          sections: [{id: 'sec-1', title: 'Intro', objectiveIds: ['obj-1'], claimIds: ['claim-dcf-definition'], prereqSectionIds: [], durationSeconds: 60}],
          language: 'en',
          tone: 'professional',
        }),
        claims,
        aspectRatio: '16:9',
        style: 'professional',
      },
      {},
    );
    expect(storyboard.scenes.every((scene) => scene.claimIds.length > 0)).toBe(true);
  });

  it('substitutes invalid catalog payloads with a topic-neutral payload', async () => {
    const storyboard = await pipelineWithBrokenModel().generateStoryboard(
      {
        script: {
          schemaVersion: 1,
          id: 'script-broken',
          title: 'Interview',
          language: 'en',
          tone: 'professional',
          chapters: [{id: 'c1', title: 'Prep', sectionId: 's1', segments: [{id: 's1', chapterId: 'c1', sectionId: 's1', text: 'Get ready', claimIds: ['claim-dcf-definition']}]}],
        },
        lessonPlan: LessonPlanV1.parse({
          schemaVersion: 1,
          id: 'lesson-broken',
          title: 'Interview',
          audienceLevel: 'beginner',
          targetDurationSeconds: 300,
          learningObjectives: [{id: 'o1', text: 'Be ready'}],
          sections: [{id: 's1', title: 'Prep', objectiveIds: ['o1'], claimIds: ['claim-dcf-definition'], prereqSectionIds: [], durationSeconds: 60}],
          language: 'en',
          tone: 'professional',
        }),
        claims,
        aspectRatio: '16:9',
        style: 'professional',
      },
      {},
    );
    const scene = storyboard.scenes[0]!;
    expect((scene.visual as {data: {data: unknown}}).data.data).toEqual({
      title: 'Broken',
      bullets: ['First point', 'Second point', 'Third point'],
    });
  });
});

function pipelineWithBrokenModel() {
  return new ContentPipeline({
    llm: {
      provider: 'stub',
      model: 'stub',
      async generateStructured<T>(input: Parameters<LLMProvider['generateStructured']>[0]) {
        void input;
        return {
          data: {
            schemaVersion: 1,
            id: 'sb-broken',
            theme: {
              background: '#08111F', surface: '#10213A', primary: '#59D5E0', accent: '#F7C948',
              text: '#F8FAFC', muted: '#9FB2C8', danger: '#FB7185', safeAreaX: 96, safeAreaY: 64,
            },
            scenes: [
              {
                schemaVersion: 1,
                id: 'scene-x',
                sceneVersionId: 'scene-x-v1',
                index: 0,
                title: 'Broken',
                narration: 'Get ready.',
                durationSeconds: 10,
                claimIds: ['claim-dcf-definition'],
                chapterId: 'c1',
                visual: {
                  type: 'catalog',
                  schemaVersion: 1,
                  intent: 'show',
                  data: {visualId: 'bullet-reveal', title: 'Broken', data: {title: 'Broken'}},
                },
                provider: {provider: 'stub', model: 'stub', costUsd: '0', durationMs: 0},
                inputHash: 'a'.repeat(64),
              },
            ],
          },
          raw: {},
          provider: 'stub',
          model: 'stub',
          usage: {inputUnits: '0', outputUnits: '0', providerCostUsd: '0', computeDurationMs: 1},
        } as ProviderResult<T>;
      },
    },
  });
}
