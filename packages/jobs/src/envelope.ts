import {stableHash} from '@motionknowledge/schemas/hash';
import type {JobName} from './names';

export type JobEnvelope<T> = Readonly<{
  schemaVersion: 1;
  jobId: string;
  workspaceId: string;
  projectId: string;
  operation: JobName;
  inputHash: string;
  idempotencyKey: string;
  attempt: number;
  payload: T;
}>;

export function buildIdempotencyKey(input: {
  workspaceId: string;
  projectId: string;
  operation: JobName;
  inputHash: string;
  nonce?: string;
}): string {
  const base = [input.workspaceId, input.projectId, input.operation, input.inputHash].join('|');
  return input.nonce ? `${base}|${input.nonce}` : base;
}

export function computeInputHash(value: unknown): string {
  return stableHash(value);
}
