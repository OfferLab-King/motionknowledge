import {describe, expect, it} from 'vitest';
import {ContentPipeline} from './pipeline';
import {MockProvider, dcfClaims} from '@motionknowledge/providers';
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
});
