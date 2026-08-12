import {z} from 'zod';
import {and, eq} from 'drizzle-orm';
import {projects, claims, scenes} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {LessonPlanV1, ScriptV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {PipelinePayloadSchema, enqueueNext} from './outline';

export async function handleGenerateStoryboard(
  input: {payload: z.infer<typeof PipelinePayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  const lessonVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'LESSON_PLAN'});
  const scriptVersion = await repo.getActiveVersion({projectId: payload.projectId, workspaceId: payload.workspaceId, artifactType: 'SCRIPT'});
  if (!lessonVersion || !scriptVersion) throw new Error('Missing lesson plan or script');
  const lesson = LessonPlanV1.parse(lessonVersion.payload);
  const script = ScriptV1.parse(scriptVersion.payload);

  const claimRows = await deps.db.select().from(claims).where(eq(claims.projectId, payload.projectId));
  const researchClaims: Array<{schemaVersion: 1; id: string; text: string; sourceIds: string[]; confidence: 'low' | 'medium' | 'high'; category: string}> = claimRows.map((row) => ({
    schemaVersion: 1,
    id: row.claimId,
    text: row.text,
    sourceIds: [],
    confidence: row.confidence as 'low' | 'medium' | 'high',
    category: row.category,
  }));

  const storyboard = await deps.contentPipeline.generateStoryboard(
    {
      script,
      lessonPlan: lesson,
      claims: researchClaims,
      aspectRatio: project.aspectRatio as '16:9' | '9:16',
      style: project.style,
    },
    {workspaceId: payload.workspaceId, projectId: payload.projectId, correlationId: input.envelope.idempotencyKey},
  );

  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'STORYBOARD',
    schemaVersion: 1,
    payload: storyboard,
    inputHash: stableHash(storyboard),
    provider: deps.llm.provider,
    costUsd: '0',
  });

  for (const scene of storyboard.scenes) {
    const sceneRow = await deps.db
      .insert(scenes)
      .values({
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        sceneKey: scene.id,
        index: scene.index,
        title: scene.title,
        status: 'PENDING',
      })
      .onConflictDoNothing({target: [scenes.projectId, scenes.sceneKey]})
      .returning();
    let sceneId = sceneRow[0]?.id;
    if (!sceneId) {
      const existing = await deps.db
        .select()
        .from(scenes)
        .where(and(eq(scenes.projectId, payload.projectId), eq(scenes.sceneKey, scene.id)))
        .limit(1);
      sceneId = existing[0]?.id;
    }
    if (!sceneId) throw new Error('Scene row missing');
    await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_SCENE', {sceneId: scene.id, storyboardHash: storyboard.id}, {sceneId: scene.id});
  }

  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'STORYBOARD_READY', 'GENERATING');
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
