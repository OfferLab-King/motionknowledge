import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, sources, claims, claimSourceLinks} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {ResearchDocumentV1} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {enqueueNext} from './outline';

export const ResearchPayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
});

export async function handleResearchProject(
  input: {payload: z.infer<typeof ResearchPayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const sourceRows = await deps.db.select().from(sources).where(eq(sources.projectId, payload.projectId)).limit(1);
  const result = await deps.researchService.research({
    topic: project.title,
    audienceLevel: project.audienceLevel as 'beginner' | 'intermediate' | 'advanced',
    language: project.language,
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    correlationId: input.envelope.idempotencyKey,
  });
  const document = ResearchDocumentV1.parse(result.document);

  const {ArtifactRepositoryImpl} = await import('@motionknowledge/database');
  const repo = new ArtifactRepositoryImpl(deps.db);
  await repo.promoteVersion({
    projectId: payload.projectId,
    workspaceId: payload.workspaceId,
    artifactType: 'RESEARCH',
    schemaVersion: 1,
    payload: document,
    inputHash: stableHash(document),
    provider: result.provider,
  });

  const knownSourceId = sourceRows[0] ? String(sourceRows[0].id) : null;
  for (const claim of document.claims) {
    const inserted = await deps.db
      .insert(claims)
      .values({
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        claimId: claim.id,
        text: claim.text,
        confidence: claim.confidence,
        category: claim.category,
      })
      .onConflictDoNothing({target: [claims.projectId, claims.claimId]})
      .returning({id: claims.id});
    const claimRowId = inserted[0]?.id;
    if (claimRowId && knownSourceId) {
      await deps.db
        .insert(claimSourceLinks)
        .values({claimId: claimRowId, sourceId: knownSourceId})
        .onConflictDoNothing();
    }
  }

  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'DRAFT', 'RESEARCHING');
  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'RESEARCHING', 'OUTLINE_READY');
  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_OUTLINE', {researchHash: document.id});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
