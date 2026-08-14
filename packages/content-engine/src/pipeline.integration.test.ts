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
        format: 'explainer',
        templateId: 'modern-explainer',
        styleId: 'signature',
      },
      {},
    );
    expect(storyboard.scenes.every((scene) => scene.claimIds.length > 0)).toBe(true);
    expect(storyboard.format).toBe('explainer');
    expect(storyboard.styleId).toBe('signature');
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
        format: 'explainer',
        templateId: null,
        styleId: 'signature',
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

describe('storyboard claim provenance repair', () => {
  it('derives claim provenance from the script chapter when the model omits claimIds', async () => {
    const pipeline = new ContentPipeline({
      llm: {
        provider: 'stub',
        model: 'stub',
        async generateStructured<T>(input: Parameters<LLMProvider['generateStructured']>[0]) {
          void input;
          return {
            data: {
              schemaVersion: 1,
              id: 'sb-no-claims',
              scenes: [
                {
                  schemaVersion: 1,
                  id: 'scene-a',
                  sceneVersionId: 'scene-a-v1',
                  index: 0,
                  title: 'Intro',
                  narration: 'Welcome.',
                  durationSeconds: 10,
                  claimIds: [],
                  chapterId: 'chapter-1',
                  visual: {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'X'}},
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
    const storyboard = await pipeline.generateStoryboard(
      {
        script: {
          schemaVersion: 1,
          id: 'script-claims',
          title: 'DCF',
          language: 'en',
          tone: 'professional',
          chapters: [
            {
              id: 'chapter-1',
              title: 'Intro',
              sectionId: 'sec-1',
              segments: [
                {id: 's1', chapterId: 'chapter-1', sectionId: 'sec-1', text: 'Welcome', claimIds: ['claim-dcf-definition', 'claim-dcf-rate']},
              ],
            },
          ],
        },
        lessonPlan: LessonPlanV1.parse({
          schemaVersion: 1,
          id: 'lesson-3',
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
        format: 'explainer',
        templateId: null,
        styleId: 'signature',
      },
      {},
    );
    const scene = storyboard.scenes[0]!;
    expect(scene.claimIds).toEqual(['claim-dcf-definition', 'claim-dcf-rate']);
  });

  it('still rejects scenes whose chapter provides no claims', async () => {
    const pipeline = new ContentPipeline({
      llm: {
        provider: 'stub',
        model: 'stub',
        async generateStructured<T>(input: Parameters<LLMProvider['generateStructured']>[0]) {
          void input;
          return {
            data: {
              schemaVersion: 1,
              id: 'sb-orphan',
              scenes: [
                {
                  schemaVersion: 1,
                  id: 'scene-orphan',
                  sceneVersionId: 'scene-orphan-v1',
                  index: 0,
                  title: 'Orphan',
                  narration: 'zzz completely unrelated terminology qzx.',
                  durationSeconds: 10,
                  claimIds: [],
                  chapterId: 'unknown-chapter',
                  visual: {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'X'}},
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
    await expect(
      pipeline.generateStoryboard(
        {
          script: {
            schemaVersion: 1,
            id: 'script-orphan',
            title: 'DCF',
            language: 'en',
            tone: 'professional',
            chapters: [{id: 'chapter-1', title: 'Intro', sectionId: 'sec-1', segments: [{id: 's1', chapterId: 'chapter-1', sectionId: 'sec-1', text: 'Welcome', claimIds: ['claim-dcf-definition']}]}],
          },
          lessonPlan: LessonPlanV1.parse({
            schemaVersion: 1,
            id: 'lesson-4',
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
          format: 'explainer',
          templateId: null,
          styleId: 'signature',
        },
        {},
      ),
    ).rejects.toThrow(/without claim provenance/);
  });

  it('matches scenes with invented chapter ids to the script chapter by narration overlap', async () => {
    const pipeline = new ContentPipeline({
      llm: {
        provider: 'stub',
        model: 'stub',
        async generateStructured<T>(input: Parameters<LLMProvider['generateStructured']>[0]) {
          void input;
          return {
            data: {
              schemaVersion: 1,
              id: 'sb-invented-chapter',
              scenes: [
                {
                  schemaVersion: 1,
                  id: 'scene-a',
                  sceneVersionId: 'scene-a-v1',
                  index: 0,
                  title: 'Intro',
                  narration: 'Welcome to the discount rate discussion.',
                  durationSeconds: 10,
                  claimIds: [],
                  chapterId: 'made-up-chapter-9',
                  visual: {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'X'}},
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
    const storyboard = await pipeline.generateStoryboard(
      {
        script: {
          schemaVersion: 1,
          id: 'script-match',
          title: 'DCF',
          language: 'en',
          tone: 'professional',
          chapters: [
            {
              id: 'chapter-rate',
              title: 'Discount rate',
              sectionId: 'sec-1',
              segments: [
                {id: 's1', chapterId: 'chapter-rate', sectionId: 'sec-1', text: 'The discount rate reflects risk and the time value of money.', claimIds: ['claim-dcf-rate']},
              ],
            },
            {
              id: 'chapter-formula',
              title: 'Formula',
              sectionId: 'sec-2',
              segments: [
                {id: 's2', chapterId: 'chapter-formula', sectionId: 'sec-2', text: 'The present value divides cash flow by one plus the rate.', claimIds: ['claim-dcf-formula']},
              ],
            },
          ],
        },
        lessonPlan: LessonPlanV1.parse({
          schemaVersion: 1,
          id: 'lesson-5',
          title: 'DCF',
          audienceLevel: 'beginner',
          targetDurationSeconds: 300,
          learningObjectives: [{id: 'obj-1', text: 'Explain DCF'}],
          sections: [{id: 'sec-1', title: 'Intro', objectiveIds: ['obj-1'], claimIds: ['claim-dcf-rate'], prereqSectionIds: [], durationSeconds: 60}],
          language: 'en',
          tone: 'professional',
        }),
        claims,
        aspectRatio: '16:9',
        format: 'explainer',
        templateId: null,
        styleId: 'signature',
      },
      {},
    );
    expect(storyboard.scenes[0]!.claimIds).toEqual(['claim-dcf-rate']);
  });
});
