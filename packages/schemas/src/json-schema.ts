import type {z} from 'zod';
import {zodToJsonSchema as zod3ToJsonSchema} from 'zod-to-json-schema';

/**
 * Converts a Zod schema to a JSON Schema object. Prefers zod v4's native
 * `toJSONSchema()` (zod-to-json-schema@3.x cannot read the new v4 internals),
 * falling back to zod-to-json-schema for classic/v3 schemas.
 */
export function toJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  const native = (schema as {toJSONSchema?: () => unknown}).toJSONSchema;
  if (typeof native === 'function') {
    const result = native.call(schema);
    if (result && typeof result === 'object') {
      return result as Record<string, unknown>;
    }
  }
  return zod3ToJsonSchema(schema as never) as Record<string, unknown>;
}
