import type {z} from 'zod';
import type {LLMProvider, ProviderResult} from './llm';
import type {ResearchInput, ResearchProvider} from './research';
import type {ResearchDocument} from '@motionknowledge/schemas';

/**
 * Deterministic local provider used for credential-free operation and for
 * provider-contract tests. Every operation returns stable, source-grounded
 * fixtures (the bundled DCF workflow) and records zero-cost usage.
 */
export class MockProvider implements LLMProvider, ResearchProvider {
  readonly provider = 'mock';
  readonly model = 'mock-dcf';

  async generateStructured<T>(input: {
    operation: string;
    schema: z.ZodType<T>;
    system: string;
    prompt: string;
    idempotencyKey: string;
  }): Promise<ProviderResult<T>> {
    const startedAt = Date.now();
    const data = this.fixtureFor(input.operation, input.schema, input.prompt);
    return {
      data,
      raw: {operation: input.operation, deterministic: true},
      provider: this.provider,
      model: this.model,
      usage: {
        inputUnits: '0',
        outputUnits: '0',
        providerCostUsd: '0',
        computeDurationMs: Date.now() - startedAt,
      },
      correlationId: input.idempotencyKey,
    };
  }

  async research(input: ResearchInput): Promise<ResearchDocument> {
    return {
      schemaVersion: 1,
      id: `research-mock-${input.topic.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}`,
      sources: dcfSources(),
      claims: dcfClaims(),
      generatedAt: new Date().toISOString(),
      provider: 'mock',
    };
  }

  private fixtureFor<T>(operation: string, schema: z.ZodType<T>, prompt: string): T {
    const operationKey = operation.split(':').pop() ?? operation;
    switch (operationKey) {
      case 'extract-claims': {
        return schema.parse({
          schemaVersion: 1,
          id: 'research-mock-extract',
          sources: dcfSources(),
          claims: dcfClaims(),
          generatedAt: new Date().toISOString(),
          provider: 'mock',
        }) as T;
      }
      case 'research': {
        return schema.parse({
          schemaVersion: 1,
          id: 'research-mock-topic',
          sources: dcfSources(),
          claims: dcfClaims(),
          generatedAt: new Date().toISOString(),
          provider: 'mock',
        }) as T;
      }
      case 'lesson-plan': {
        return schema.parse(dcfLessonPlan(prompt)) as T;
      }
      case 'script': {
        return schema.parse(dcfScript()) as T;
      }
      case 'storyboard': {
        return schema.parse(dcfStoryboard()) as T;
      }
      case 'scene': {
        return schema.parse(dcfScene()) as T;
      }
      case 'metadata': {
        return schema.parse({
          schemaVersion: 1,
          projectId: '00000000-0000-0000-0000-000000000000',
          title: 'What is a Discounted Cash Flow? (educational overview)',
          description:
            'A beginner-friendly, source-grounded explanation of discounted cash flow valuation. Educational material, not investment advice.',
          tags: ['finance', 'dcf', 'valuation', 'education'],
          category: 'Education',
        }) as T;
      }
      default:
        throw new Error(`MockProvider has no fixture for operation ${operation}`);
    }
  }
}

export function dcfSources(): ResearchDocument['sources'] {
  return [
    {
      schemaVersion: 1,
      id: 'src-dcf-core',
      url: 'https://education.example.org/discounted-cash-flow',
      title: 'Discounted Cash Flow — Educator Reference',
      provider: 'mock',
      retrievedAt: new Date().toISOString(),
      license: 'link-only',
      attribution: null,
    },
  ];
}

export function dcfClaims(): ResearchDocument['claims'] {
  return [
    {
      schemaVersion: 1,
      id: 'claim-dcf-definition',
      text: 'A discounted cash flow (DCF) estimates the value of an investment from its expected future cash flows.',
      sourceIds: ['src-dcf-core'],
      confidence: 'high',
      category: 'definition',
    },
    {
      schemaVersion: 1,
      id: 'claim-dcf-timetime',
      text: 'Money received in the future is worth less than the same amount today because it cannot earn returns in the meantime.',
      sourceIds: ['src-dcf-core'],
      confidence: 'high',
      category: 'principle',
    },
    {
      schemaVersion: 1,
      id: 'claim-dcf-formula',
      text: 'The present value of a single cash flow is the cash flow divided by (1 plus the discount rate) raised to the number of years.',
      sourceIds: ['src-dcf-core'],
      confidence: 'high',
      category: 'formula',
    },
    {
      schemaVersion: 1,
      id: 'claim-dcf-rate',
      text: 'A higher discount rate produces a lower present value because future money is weighted less heavily.',
      sourceIds: ['src-dcf-core'],
      confidence: 'high',
      category: 'relationship',
    },
    {
      schemaVersion: 1,
      id: 'claim-dcf-compare',
      text: 'When the present value of expected cash flows exceeds the cost today, the investment may be worth considering; DCF is an estimate, not a guarantee.',
      sourceIds: ['src-dcf-core'],
      confidence: 'medium',
      category: 'application',
    },
  ];
}

export function dcfLessonPlan(prompt: string) {
  const topic = prompt.length > 200 ? prompt.slice(0, 200) : prompt;
  return {
    schemaVersion: 1,
    id: 'lesson-plan-mock',
    title: 'What is a Discounted Cash Flow?',
    audienceLevel: 'beginner',
    targetDurationSeconds: 300,
    language: 'en',
    tone: 'professional',
    learningObjectives: [
      {id: 'obj-1', text: 'Explain why a future dollar is worth less than a dollar today'},
      {id: 'obj-2', text: 'Apply the present-value formula to a simple cash flow'},
      {id: 'obj-3', text: 'Describe what the discount rate represents'},
      {id: 'obj-4', text: 'Compare present value with cost to frame an investment decision'},
    ],
    sections: [
      {
        id: 'sec-1',
        title: 'Introduction',
        objectiveIds: ['obj-1'],
        claimIds: ['claim-dcf-definition'],
        prereqSectionIds: [],
        durationSeconds: 40,
      },
      {
        id: 'sec-2',
        title: 'Cash flows over time',
        objectiveIds: ['obj-1'],
        claimIds: ['claim-dcf-timetime'],
        prereqSectionIds: ['sec-1'],
        durationSeconds: 50,
      },
      {
        id: 'sec-3',
        title: 'The discount formula',
        objectiveIds: ['obj-2', 'obj-3'],
        claimIds: ['claim-dcf-formula', 'claim-dcf-rate'],
        prereqSectionIds: ['sec-2'],
        durationSeconds: 70,
      },
      {
        id: 'sec-4',
        title: 'Step-by-step calculation',
        objectiveIds: ['obj-2'],
        claimIds: ['claim-dcf-formula'],
        prereqSectionIds: ['sec-3'],
        durationSeconds: 80,
      },
      {
        id: 'sec-5',
        title: 'Comparing value and cost',
        objectiveIds: ['obj-4'],
        claimIds: ['claim-dcf-compare', 'claim-dcf-rate'],
        prereqSectionIds: ['sec-4'],
        durationSeconds: 40,
      },
      {
        id: 'sec-6',
        title: 'Summary and disclaimer',
        objectiveIds: ['obj-4'],
        claimIds: ['claim-dcf-compare'],
        prereqSectionIds: ['sec-5'],
        durationSeconds: 20,
      },
    ],
    _topicHint: topic,
  };
}

export function dcfScript() {
  return {
    schemaVersion: 1,
    id: 'script-mock',
    title: 'What is a Discounted Cash Flow?',
    language: 'en',
    tone: 'professional',
    chapters: [
      {
        id: 'chapter-1',
        title: 'Introduction',
        sectionId: 'sec-1',
        segments: [
          {
            id: 'segment-1-1',
            chapterId: 'chapter-1',
            sectionId: 'sec-1',
            text: 'Welcome. Today we answer a classic finance question: what is a discounted cash flow, or DCF, and what does it tell you about an investment?',
            claimIds: ['claim-dcf-definition'],
          },
          {
            id: 'segment-1-2',
            chapterId: 'chapter-1',
            sectionId: 'sec-1',
            text: 'At its core, a DCF estimates the value of an investment from the cash it is expected to produce in the future. This is an educational overview, not investment advice.',
            claimIds: ['claim-dcf-definition'],
          },
        ],
      },
      {
        id: 'chapter-2',
        title: 'Cash flows over time',
        sectionId: 'sec-2',
        segments: [
          {
            id: 'segment-2-1',
            chapterId: 'chapter-2',
            sectionId: 'sec-2',
            text: 'First, think about time. Money received in the future is worth less than the same amount today, because it cannot earn returns in the meantime.',
            claimIds: ['claim-dcf-timetime'],
          },
          {
            id: 'segment-2-2',
            chapterId: 'chapter-2',
            sectionId: 'sec-2',
            text: 'Imagine a project that expects thirty, then forty, then fifty dollars in the next three years. Those are future cash flows, and we need to convert them into today\u2019s terms.',
            claimIds: ['claim-dcf-timetime'],
          },
        ],
      },
      {
        id: 'chapter-3',
        title: 'The discount formula',
        sectionId: 'sec-3',
        segments: [
          {
            id: 'segment-3-1',
            chapterId: 'chapter-3',
            sectionId: 'sec-3',
            text: 'The conversion is done with the discount formula. The present value of a single cash flow is the cash flow divided by one plus the discount rate, raised to the number of years.',
            claimIds: ['claim-dcf-formula'],
          },
          {
            id: 'segment-3-2',
            chapterId: 'chapter-3',
            sectionId: 'sec-3',
            text: 'The discount rate reflects both risk and the time value of money. A higher discount rate gives a lower present value, because we weigh future money less heavily.',
            claimIds: ['claim-dcf-rate'],
          },
        ],
      },
      {
        id: 'chapter-4',
        title: 'Step-by-step calculation',
        sectionId: 'sec-4',
        segments: [
          {
            id: 'segment-4-1',
            chapterId: 'chapter-4',
            sectionId: 'sec-4',
            text: 'Let us apply the formula step by step at a ten percent discount rate. Thirty dollars one year out becomes about twenty-seven dollars and twenty-seven cents today.',
            claimIds: ['claim-dcf-formula'],
          },
          {
            id: 'segment-4-2',
            chapterId: 'chapter-4',
            sectionId: 'sec-4',
            text: 'Forty dollars two years out becomes about thirty-three dollars and six cents, and fifty dollars three years out becomes about thirty-seven dollars and fifty-seven cents.',
            claimIds: ['claim-dcf-formula'],
          },
          {
            id: 'segment-4-3',
            chapterId: 'chapter-4',
            sectionId: 'sec-4',
            text: 'Adding these gives a total present value of roughly ninety-eight dollars.',
            claimIds: ['claim-dcf-formula'],
          },
        ],
      },
      {
        id: 'chapter-5',
        title: 'Comparing value and cost',
        sectionId: 'sec-5',
        segments: [
          {
            id: 'segment-5-1',
            chapterId: 'chapter-5',
            sectionId: 'sec-5',
            text: 'Now compare. If the investment costs one hundred dollars today but its future cash flows are worth ninety-eight dollars today, the math is not in your favor at a ten percent rate.',
            claimIds: ['claim-dcf-compare'],
          },
          {
            id: 'segment-5-2',
            chapterId: 'chapter-5',
            sectionId: 'sec-5',
            text: 'A lower discount rate would push the value up; a higher one pushes it down. The model makes assumptions explicit, but it is an estimate, not a guarantee.',
            claimIds: ['claim-dcf-rate', 'claim-dcf-compare'],
          },
        ],
      },
      {
        id: 'chapter-6',
        title: 'Summary',
        sectionId: 'sec-6',
        segments: [
          {
            id: 'segment-6-1',
            chapterId: 'chapter-6',
            sectionId: 'sec-6',
            text: 'To summarize: DCF discounts future cash flows, uses the discount rate to capture risk and time, and compares the resulting value with the cost today.',
            claimIds: ['claim-dcf-definition', 'claim-dcf-compare'],
          },
          {
            id: 'segment-6-2',
            chapterId: 'chapter-6',
            sectionId: 'sec-6',
            text: 'Remember, this is educational material, not investment advice. Thanks for watching, and keep building your finance foundation.',
            claimIds: ['claim-dcf-compare'],
          },
        ],
      },
    ],
  };
}

export function dcfStoryboard() {
  const mk = (
    id: string,
    index: number,
    title: string,
    narration: string,
    claimIds: string[],
    visual: unknown,
    durationSeconds: number,
  ): {
    schemaVersion: 1;
    id: string;
    sceneVersionId: string;
    index: number;
    title: string;
    narration: string;
    durationSeconds: number;
    claimIds: string[];
    chapterId: string;
    visual: unknown;
    provider: {provider: string; model: string; costUsd: string; durationMs: number};
    inputHash: string;
  } => ({
    schemaVersion: 1,
    id,
    sceneVersionId: `${id}-v1`,
    index,
    title,
    narration,
    durationSeconds,
    claimIds,
    chapterId: 'chapter-1',
    visual,
    provider: {provider: 'mock', model: 'mock-dcf', costUsd: '0', durationMs: 0},
    inputHash: '0'.repeat(64),
  });
  return {
    schemaVersion: 1,
    id: 'storyboard-mock',
    theme: {
      background: '#08111F',
      surface: '#10213A',
      primary: '#59D5E0',
      accent: '#F7C948',
      text: '#F8FAFC',
      muted: '#9FB2C8',
      danger: '#FB7185',
      safeAreaX: 96,
      safeAreaY: 64,
    },
    scenes: [
      mk('scene-title', 0, 'Title', 'Welcome. Today we answer a classic finance question: what is a discounted cash flow, and what does it tell you about an investment?', ['claim-dcf-definition'], {type: 'title-hero', schemaVersion: 1, intent: 'introduce', data: {title: 'What is a Discounted Cash Flow?', subtitle: 'A beginner-friendly, source-grounded explanation', kicker: 'Finance fundamentals'}}, 15),
      mk('scene-definition', 1, 'Definition', 'At its core, a DCF estimates the value of an investment from the cash it is expected to produce in the future. This is educational material, not investment advice.', ['claim-dcf-definition'], {type: 'catalog', schemaVersion: 1, intent: 'define', data: {visualId: 'definition-card', title: 'Definition', data: {term: 'Discounted Cash Flow', definition: 'A method that estimates what future money is worth today by applying a discount rate.', example: 'Receiving $110 next year is worth less than $110 today.'}}}, 25),
      mk('scene-cashflow-timeline', 2, 'Cash-flow timeline', 'Money received in the future is worth less than the same amount today, because it cannot earn returns in the meantime. A project expects thirty, then forty, then fifty dollars over three years.', ['claim-dcf-timetime'], {type: 'cashflow-timeline', schemaVersion: 1, intent: 'explain', data: {title: 'Expected cash flows', periods: [{year: 0, label: 'Year 0', amount: -100, displayAmount: '−$100', type: 'outflow'}, {year: 1, label: 'Year 1', amount: 30, displayAmount: '$30', type: 'inflow'}, {year: 2, label: 'Year 2', amount: 40, displayAmount: '$40', type: 'inflow'}, {year: 3, label: 'Year 3', amount: 50, displayAmount: '$50', type: 'inflow'}]}}, 30),
      mk('scene-discount-formula', 3, 'The discount formula', 'The present value of a single cash flow is the cash flow divided by one plus the discount rate, raised to the number of years. The discount rate reflects risk and the time value of money.', ['claim-dcf-formula', 'claim-dcf-rate'], {type: 'formula', schemaVersion: 1, intent: 'define', data: {title: 'The discount formula', formula: 'PV = CF / (1 + r)^t', description: 'Present value of a future cash flow CF at rate r over t years'}}, 35),
      mk('scene-calculation', 4, 'Step-by-step calculation', 'Let us apply the formula step by step at a ten percent discount rate. Thirty dollars one year out becomes about twenty-seven dollars and twenty-seven cents. Forty dollars becomes about thirty-three dollars and six cents. Fifty dollars becomes about thirty-seven dollars and fifty-seven cents. The total is roughly ninety-eight dollars.', ['claim-dcf-formula'], {type: 'catalog', schemaVersion: 1, intent: 'calculate', data: {visualId: 'step-by-step-calculation', title: 'Present value, step by step', data: {title: 'Present value, step by step', steps: [{expression: 'PV₁ = $30 / 1.10', result: '$27.27'}, {expression: 'PV₂ = $40 / 1.10²', result: '$33.06'}, {expression: 'PV₃ = $50 / 1.10³', result: '$37.57'}], conclusion: 'Total present value ≈ $97.90'}}}, 55),
      mk('scene-value-rate-chart', 5, 'Value versus discount rate', 'A higher discount rate gives a lower present value, because we weigh future money less heavily. This chart shows how value falls as the rate rises.', ['claim-dcf-rate'], {type: 'catalog', schemaVersion: 1, intent: 'compare', data: {visualId: 'line-chart', title: 'Present value vs discount rate', data: {title: 'Present value vs discount rate', series: [{label: '5%', value: 106}, {label: '8%', value: 100}, {label: '10%', value: 96}, {label: '15%', value: 87}, {label: '20%', value: 79}]}}}, 35),
      mk('scene-comparison', 6, 'DCF comparison', 'If the investment costs one hundred dollars today but its future cash flows are worth ninety-eight dollars today, the math is not in your favor at a ten percent rate.', ['claim-dcf-compare'], {type: 'comparison', schemaVersion: 1, intent: 'compare', data: {title: 'Value vs cost', items: [{name: 'Present value', value: '≈ $98 at a 10% rate'}, {name: 'Cost today', value: '$100'}]}}, 30),
      mk('scene-recap', 7, 'Summary', 'To summarize: DCF discounts future cash flows, uses the discount rate to capture risk and time, and compares the resulting value with the cost today.', ['claim-dcf-definition', 'claim-dcf-compare'], {type: 'catalog', schemaVersion: 1, intent: 'recap', data: {visualId: 'summary', title: 'Summary', data: {title: 'Summary', points: ['DCF discounts future cash flows', 'The discount rate reflects risk and time', 'Compare the result with the cost today', 'It is a model, not a guarantee']}}}, 45),
      mk('scene-outro', 8, 'Outro', 'Remember, this is educational material, not investment advice. Thanks for watching, and keep building your finance foundation.', ['claim-dcf-compare'], {type: 'catalog', schemaVersion: 1, intent: 'close', data: {visualId: 'outro', title: 'Outro', data: {title: 'Thanks for watching', tagline: 'Educational material — not investment advice'}}}, 20),
    ],
  };
}

export function dcfScene() {
  const storyboard = dcfStoryboard();
  return storyboard.scenes[4];
}
