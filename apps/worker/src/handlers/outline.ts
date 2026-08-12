import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, claims} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {buildIdempotencyKey, computeInputHash, type JobName} from '@motionknowledge/jobs';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';

export const PipelinePayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
});

export async function enqueueNext(
  deps: WorkerDeps,
  workspaceId: string,
  projectId: string,
  operation: JobName,
  inputHashValue: unknown,
  extraPayload: Record<string, unknown> = {},
): Promise<void> {
  const inputHash = computeInputHash(inputHashValue);
  await deps.queue.enqueue({
    jobId: `${projectId}-${operation.toLowerCase()}`,
    workspaceId,
    projectId,
    operation,
    inputHash,
    idempotencyKey: buildIdempotencyKey({workspaceId, projectId, operation, inputHash}),
    payload: {workspaceId, projectId, ...extraPayload},
  });
}

export async function handleGenerateOutline(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const claimRows = await deps.db.select().from(claims).where(eq(claims.projectId, payload.projectId));
  const researchClaims: Array<{schemaVersion: 1; id: string; text: string; sourceIds: string[]; confidence: 'low' | 'medium' | 'high'; category: string}> = claimRows.map((row) => ({
    schemaVersion: 1,
    id: row.claimId,
    text: row.text,
    sourceIds: [],
    confidence: row.confidence as 'low' | 'medium' | 'high',
    category: row.category,
  }));

  const lesson = await deps.contentPipeline.generateLesson(
    {
      projectTitle: project.title,
      claims: researchClaims,
      targetDurationSeconds: project.targetDurationSeconds,
      audienceLevel: project.audienceLevel as 'beginner' | 'intermediate' | 'advanced',
      language: project.language,
      tone: project.tone,
    },
    {workspaceId: payload.workspaceId, projectId: payload.projectId, correlationId: input.envelope.idempotencyKey},
  );

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'LESSON_PLAN',
    schemaVersion: 1,
    payload: lesson,
    inputHash: stableHash(lesson),
    provider: deps.llm.provider,
    costUsd: '0',
  });

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_SCRIPT', {lessonId: lesson.id});
  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'OUTLINE_READY', 'SCRIPT_READY');
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
