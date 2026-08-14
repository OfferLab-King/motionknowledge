import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {projects, sources, claims, claimSourceLinks} from '@motionknowledge/database';
import {stableHash} from '@motionknowledge/schemas/hash';
import {ResearchDocumentV1, type ResearchClaim, type ResearchSource, type SourceDocument} from '@motionknowledge/schemas';
import type {WorkerDeps} from '../deps';
import {markJobSucceeded, transitionProject} from '../lib/helpers';
import {enqueueNext} from './outline';
import {fetchSafeUrl, sourceTextKey} from '@motionknowledge/research';

export const ResearchPayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
});

export const IngestPayloadSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  sourceId: z.string(),
});

export async function loadSourceText(deps: WorkerDeps, workspaceId: string, projectId: string, sourceId: string): Promise<string | null> {
  try {
    const bytes = await deps.storage.get(sourceTextKey(workspaceId, projectId, sourceId));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function saveSourceText(deps: WorkerDeps, workspaceId: string, projectId: string, sourceId: string, text: string): Promise<void> {
  const body = new TextEncoder().encode(text);
  const sha256 = await import('node:crypto').then(({createHash}) => createHash('sha256').update(body).digest('hex'));
  await deps.storage.put({key: sourceTextKey(workspaceId, projectId, sourceId), body, contentType: 'text/plain', sha256});
}

/**
 * INGEST_SOURCE: fetch a URL source (SSRF-safe), extract its text, store the
 * normalized text, mark the row PROCESSED, then chain RESEARCH_PROJECT.
 * Failures mark the row FAILED and still chain research so the project
 * proceeds on the topic alone.
 */
export async function handleIngestSource(
  input: {payload: z.infer<typeof IngestPayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');
  const sourceRow = (await deps.db.select().from(sources).where(eq(sources.id, payload.sourceId)))[0];
  if (!sourceRow) throw new Error(`Source ${payload.sourceId} not found`);

  if (sourceRow.status !== 'PENDING' || !sourceRow.originalUrl) {
    // Already processed (or not a URL): nothing to fetch, proceed to research.
    await enqueueNext(deps, payload.workspaceId, payload.projectId, 'RESEARCH_PROJECT', {projectId: payload.projectId});
    await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
    return;
  }

  try {
    const fetched = await fetchSafeUrl(sourceRow.originalUrl);
    await saveSourceText(deps, payload.workspaceId, payload.projectId, String(sourceRow.id), fetched.text);
    await deps.db
      .update(sources)
      .set({
        title: sourceRow.title || new URL(sourceRow.originalUrl).hostname,
        rawSha256: fetched.rawSha256,
        normalizedSha256: await import('@motionknowledge/assets').then(({hashText}) => hashText(fetched.text)),
        fetchedAt: new Date(),
        byteCount: fetched.byteCount,
        status: 'PROCESSED',
        failureReason: null,
      })
      .where(eq(sources.id, sourceRow.id));
  } catch (error) {
    await deps.db
      .update(sources)
      .set({status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 500) : 'ingest failed'})
      .where(eq(sources.id, sourceRow.id));
  }

  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'RESEARCH_PROJECT', {projectId: payload.projectId});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}

async function rowToSourceDocument(row: typeof sources.$inferSelect): Promise<SourceDocument> {
  return {
    schemaVersion: 1,
    id: String(row.id),
    projectId: String(row.projectId),
    supplied: row.originalUrl === null,
    kind: row.kind as SourceDocument['kind'],
    title: row.title,
    rawSha256: row.rawSha256,
    normalizedSha256: row.normalizedSha256,
    originalUrl: row.originalUrl,
    fetchedAt: row.fetchedAt ? row.fetchedAt.toISOString() : null,
    language: row.language,
    byteCount: row.byteCount,
    status: row.status as SourceDocument['status'],
    failureReason: row.failureReason,
  };
}

/**
 * RESEARCH_PROJECT: extract claims from every processed supplied source
 * (pasted text / ingested URLs), then run topic research for supplemental
 * claims, and promote one merged document.
 */
export async function handleResearchProject(
  input: {payload: z.infer<typeof ResearchPayloadSchema>; envelope: {idempotencyKey: string}; deps: WorkerDeps},
): Promise<void> {
  const {deps, payload} = input;
  const project = await deps.db.query.projects.findFirst({where: eq(projects.id, payload.projectId)});
  if (!project) throw new Error('Project not found');

  const sourceRows = await deps.db.select().from(sources).where(eq(sources.projectId, payload.projectId));
  const suppliedClaims: ResearchClaim[] = [];
  const suppliedSources: ResearchSource[] = [];
  const sourceLinkByClaim = new Map<string, string>();
  for (const row of sourceRows) {
    if (row.status !== 'PROCESSED') continue;
    const text = await loadSourceText(deps, payload.workspaceId, payload.projectId, String(row.id));
    if (!text) continue;
    const extracted = await deps.researchService.extractClaims(
      {source: await rowToSourceDocument(row), text},
      `${input.envelope.idempotencyKey}:${row.id}`,
    );
    suppliedClaims.push(...extracted.claims);
    suppliedSources.push(extracted.researchSource);
    for (const claim of extracted.claims) sourceLinkByClaim.set(claim.id, String(row.id));
  }

  const result = await deps.researchService.research({
    topic: project.title,
    audienceLevel: project.audienceLevel as 'beginner' | 'intermediate' | 'advanced',
    language: project.language,
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    correlationId: input.envelope.idempotencyKey,
  });
  const topicDocument = ResearchDocumentV1.parse(result.document);

  const seenClaimIds = new Set<string>();
  const mergedClaims: ResearchClaim[] = [];
  for (const claim of [...suppliedClaims, ...topicDocument.claims]) {
    if (seenClaimIds.has(claim.id)) continue;
    seenClaimIds.add(claim.id);
    mergedClaims.push(claim);
  }

  const document = ResearchDocumentV1.parse({
    ...topicDocument,
    sources: [...suppliedSources, ...topicDocument.sources],
    claims: mergedClaims,
  });

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
    if (claimRowId) {
      const sourceId = sourceLinkByClaim.get(claim.id) ?? (sourceRows[0] ? String(sourceRows[0].id) : null);
      if (sourceId) {
        await deps.db
          .insert(claimSourceLinks)
          .values({claimId: claimRowId, sourceId})
          .onConflictDoNothing();
      }
    }
  }

  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'DRAFT', 'RESEARCHING');
  await transitionProject(deps.db, payload.projectId, payload.workspaceId, 'RESEARCHING', 'OUTLINE_READY');
  await enqueueNext(deps, payload.workspaceId, payload.projectId, 'GENERATE_OUTLINE', {researchHash: document.id});
  await markJobSucceeded(deps.db, input.envelope.idempotencyKey);
}
