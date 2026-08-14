import type {LessonPlan, ResearchClaim, Script, Storyboard, YouTubeMetadata} from '@motionknowledge/schemas';
import type {LLMProvider} from '@motionknowledge/providers';
import type {UsageLedger} from '@motionknowledge/usage';
import {generateLesson} from './lesson';
import {generateScript} from './script';
import {generateStoryboard} from './storyboard';
import {generateYouTubeMetadata} from './metadata';

export interface PipelineOptions {
  llm: LLMProvider;
  usage?: UsageLedger;
}

export interface PipelineContext {
  workspaceId?: string;
  projectId?: string;
  correlationId?: string;
}

export class ContentPipeline {
  constructor(private readonly options: PipelineOptions) {}

  async generateLesson(
    input: {
      projectTitle: string;
      claims: ResearchClaim[];
      targetDurationSeconds: number;
      audienceLevel: 'beginner' | 'intermediate' | 'advanced';
      language: string;
      tone: string;
      format?: string;
    },
    context: PipelineContext,
  ): Promise<LessonPlan> {
    const plan = await generateLesson(input, this.options.llm, context.correlationId ?? 'lesson');
    await this.recordUsage(context, 'content:lesson-plan');
    return plan;
  }

  async generateScript(
    lessonPlan: LessonPlan,
    claims: ResearchClaim[],
    context: PipelineContext = {},
  ): Promise<Script> {
    const script = await generateScript(
      {lessonPlan, claims, language: lessonPlan.language, tone: lessonPlan.tone},
      this.options.llm,
      context.correlationId ?? 'script',
    );
    await this.recordUsage(context, 'content:script');
    return script;
  }

  async generateStoryboard(
    input: {
      script: Script;
      lessonPlan: LessonPlan;
      claims: ResearchClaim[];
      aspectRatio: '16:9' | '9:16';
      format: string;
      templateId: string | null;
      styleId: string;
      language?: string;
    },
    context: PipelineContext,
  ): Promise<Storyboard> {
    const storyboard = await generateStoryboard(input, this.options.llm, context.correlationId ?? 'storyboard');
    await this.recordUsage(context, 'content:storyboard');
    return storyboard;
  }

  async generateYouTubeMetadata(
    input: {projectTitle: string; scriptPreview: string; transcriptPreview: string},
    context: PipelineContext,
  ): Promise<YouTubeMetadata> {
    const metadata = await generateYouTubeMetadata(input, this.options.llm, context.correlationId ?? 'metadata');
    await this.recordUsage(context, 'content:metadata');
    return metadata;
  }

  private async recordUsage(context: PipelineContext, operation: string): Promise<void> {
    if (!this.options.usage || !context.projectId || !context.workspaceId) return;
    await this.options.usage.record({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      provider: this.options.llm.provider,
      model: 'model',
      operation,
      computeDurationMs: 0,
      correlationId: context.correlationId,
    });
  }
}
