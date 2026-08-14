/**
 * Storage key convention for normalized source text. The worker stores
 * extracted text here during ingestion; research reads it back; the web app
 * writes pasted-text sources. One convention, shared across processes.
 */
export function sourceTextKey(workspaceId: string, projectId: string, sourceId: string): string {
  return `${workspaceId}/${projectId}/sources/${sourceId}/normalized.txt`;
}
