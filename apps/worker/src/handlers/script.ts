import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, claims} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {LessonPlanV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {PipelinePayloadSchema, enqueueNext} from './outline';

export async function handleGenerateScript(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const lessonVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'LESSON_PLAN'});
  if (!lessonVersion) throw new Error('No active lesson plan');
  const lesson = LessonPlanV1.parse(lessonVersion.payload);

  const claimRows = await deps.db.select().from(claims).where(eq(claims.projectId, payload.projectId));
  const researchClaims: Array<{schemaVersion: 1; id: string; text: string; sourceIds: string[]; confidence: 'low' | 'medium' | 'high'; category: string}> = claimRows.map((row) => ({
    schemaVersion: 1,
    id: row.claimId,
    text: row.text,
    sourceIds: [],
    confidence: row.confidence as 'low' | 'medium' | 'high',
    category: row.category,
  }));

  const script = await deps.contentPipeline.generateScript(lesson, researchClaims, {
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    correlationId: input.envelope.idempotencyKey,
  });

  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'SCRIPT',
    schemaVersion: 1,
    payload: script,
    inputHash: stableHash(script),
    provider: deps.llm.provider,
    costUsd: '0',
  });

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_STORYBOARD', {scriptId: script.id});
  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'SCRIPT_READY', 'STORYBOARD_READY');
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
