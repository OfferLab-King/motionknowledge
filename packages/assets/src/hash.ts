import {createHash} from 'node:crypto';

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function assetKey(workspaceId: string, projectId: string, kind: string, hash: string): string {
  return `${workspaceId}/${projectId}/${kind}/${hash.slice(0, 2)}/${hash}`;
}

export function renderOutputKey(workspaceId: string, projectId: string, renderId: string, kind: string): string {
  return `${workspaceId}/${projectId}/renders/${renderId}/${kind}`;
}
