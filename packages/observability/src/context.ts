import {AsyncLocalStorage} from 'node:async_hooks';

export interface CorrelationContext {
  correlationId?: string;
  jobId?: string;
  workspaceId?: string;
  projectId?: string;
  operation?: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function runWithContext<T>(context: CorrelationContext, fn: () => T | Promise<T>): Promise<T> {
  return correlationStorage.run({...correlationStorage.getStore(), ...context}, fn) as Promise<T>;
}

export function currentContext(): CorrelationContext {
  return correlationStorage.getStore() ?? {};
}
