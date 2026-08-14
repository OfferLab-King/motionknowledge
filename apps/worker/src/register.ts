import type {PgBoss} from 'pg-boss';
import {z} from 'zod';
import type {WorkerDeps} from './deps';
import {executeHandler, JobFailure, type JobEnvelope} from '@motionknowledge/jobs';
import {ResearchPayloadSchema, IngestPayloadSchema, handleResearchProject, handleIngestSource} from './handlers/research';
import {PipelinePayloadSchema, handleGenerateOutline} from './handlers/outline';
import {handleGenerateScript} from './handlers/script';
import {handleGenerateStoryboard} from './handlers/storyboard';
import {ScenePayloadSchema, handleGenerateScene} from './handlers/scene';
import {TtsPayloadSchema, handleSynthesizeTts} from './handlers/tts';
import {handleGenerateCaptions} from './handlers/captions';
import {handleGeneratePreview} from './handlers/preview';
import {handleRunQa} from './handlers/qa';
import {handleRenderFinal} from './handlers/render';
import {handleGenerateThumbnail} from './handlers/thumbnail';
import {HyperframePayloadSchema, handleRenderHyperframe} from './handlers/hyperframes';
import {markJobFailed} from './lib/helpers';

export interface RegisteredHandler {
  operation: string;
  payloadSchema: z.ZodType<unknown>;
  run: (input: {payload: unknown; envelope: JobEnvelope<unknown>; deps: WorkerDeps}) => Promise<void>;
}

export function buildHandlers(deps: WorkerDeps): RegisteredHandler[] {
  return [
    {operation: 'INGEST_SOURCE', payloadSchema: IngestPayloadSchema, run: handleIngestSource},
    {operation: 'RESEARCH_PROJECT', payloadSchema: ResearchPayloadSchema, run: handleResearchProject},
    {operation: 'GENERATE_OUTLINE', payloadSchema: PipelinePayloadSchema, run: handleGenerateOutline},
    {operation: 'GENERATE_SCRIPT', payloadSchema: PipelinePayloadSchema, run: handleGenerateScript},
    {operation: 'GENERATE_STORYBOARD', payloadSchema: PipelinePayloadSchema, run: handleGenerateStoryboard},
    {operation: 'GENERATE_SCENE', payloadSchema: ScenePayloadSchema, run: handleGenerateScene},
    {operation: 'SYNTHESIZE_TTS', payloadSchema: TtsPayloadSchema, run: handleSynthesizeTts},
    {operation: 'GENERATE_CAPTIONS', payloadSchema: PipelinePayloadSchema, run: handleGenerateCaptions},
    {operation: 'GENERATE_PREVIEW', payloadSchema: PipelinePayloadSchema, run: handleGeneratePreview},
    {operation: 'RUN_QA', payloadSchema: PipelinePayloadSchema, run: handleRunQa},
    {operation: 'RENDER_FINAL', payloadSchema: PipelinePayloadSchema, run: handleRenderFinal},
    {operation: 'GENERATE_THUMBNAIL', payloadSchema: PipelinePayloadSchema, run: handleGenerateThumbnail},
    {operation: 'RENDER_HYPERFRAME', payloadSchema: HyperframePayloadSchema, run: handleRenderHyperframe},
  ] as RegisteredHandler[];
}

export async function attachBossHandlers(boss: PgBoss, deps: WorkerDeps): Promise<void> {
  const handlers = buildHandlers(deps);
  const logger = deps.logger;
  for (const handler of handlers) {
    await boss.work(handler.operation, {localConcurrency: 2}, async (jobs) => {
      for (const job of jobs) {
        const envelope = job.data as JobEnvelope<unknown>;
        const startedAt = Date.now();
        try {
          const parsed = handler.payloadSchema.parse(envelope.payload);
          await handler.run({payload: parsed, envelope, deps});
          logger.info('job completed', {
            jobId: envelope.jobId,
            operation: envelope.operation,
            workspaceId: envelope.workspaceId,
            projectId: envelope.projectId,
            durationMs: Date.now() - startedAt,
            status: 'succeeded',
          });
        } catch (error) {
          const kind = error instanceof JobFailure ? error.kind : 'permanent';
          const code = error instanceof JobFailure ? error.code : 'UNEXPECTED_ERROR';
          const safeError = error instanceof Error ? error.message : String(error);
          logger.error('job failed', {
            jobId: envelope.jobId,
            operation: envelope.operation,
            workspaceId: envelope.workspaceId,
            projectId: envelope.projectId,
            durationMs: Date.now() - startedAt,
            status: 'failed',
            errorCode: code,
            errorKind: kind,
            safeError,
          });
          try {
            await markJobFailed(deps.db, envelope.idempotencyKey, code, safeError);
          } catch {
            // best effort bookkeeping
          }
          if (kind === 'transient') throw error;
        }
      }
    });
  }
}
