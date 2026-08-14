import {and, eq} from 'drizzle-orm';
import {sources, type Database} from '@motionknowledge/database';
import {getQueue} from '../lib/jobs';
import {computeInputHash, buildIdempotencyKey} from '@motionknowledge/jobs';

/** Re-enqueue INGEST_SOURCE for a failed URL source. */
export async function retrySourceIngestion(db: Database, input: {
  workspaceId: string;
  projectId: string;
  sourceId: string;
}): Promise<{jobId: string}> {
  const row = (await db.select().from(sources).where(and(eq(sources.id, input.sourceId), eq(sources.projectId, input.projectId))))[0];
  if (!row) throw new Error('Source not found');
  if (row.status !== 'FAILED' || !row.originalUrl) throw new Error('Only failed URL sources can be retried');
  await db.update(sources).set({status: 'PENDING', failureReason: null}).where(eq(sources.id, input.sourceId));
  const queue = await getQueue();
  const inputHash = computeInputHash({sourceId: input.sourceId, retry: true});
  const result = await queue.enqueue({
    jobId: `${input.projectId}-ingest-${input.sourceId}-${Date.now()}`,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operation: 'INGEST_SOURCE',
    inputHash,
    idempotencyKey: buildIdempotencyKey({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      operation: 'INGEST_SOURCE',
      inputHash,
      nonce: `${input.sourceId}:${Date.now()}`,
    }),
    payload: {workspaceId: input.workspaceId, projectId: input.projectId, sourceId: input.sourceId},
  });
  return {jobId: result.id};
}
