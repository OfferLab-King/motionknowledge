import {createHash} from 'node:crypto';

export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot canonicalize non-finite number');
    return value;
  }
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new Error('Cannot canonicalize functions or symbols');
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }
  throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

export function stableHash(value: unknown): string {
  const canonical = canonicalize(value);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
