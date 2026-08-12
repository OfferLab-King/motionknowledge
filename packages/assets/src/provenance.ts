import {z} from 'zod';
import {ALLOWED_LICENSES, assertCommercialAsset, type AssetProvenanceRecord} from './policy';
import {assetKey, hashText, sha256Hex} from './hash';

export const AssetProvenanceSchema = z.object({
  origin: z.enum(['supplied', 'research', 'generated', 'stock', 'licensed', 'derived']),
  sourceUrl: z.string().url().nullable(),
  license: z.string(),
  attribution: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  estimatedCostUsd: z.string().nullable().optional(),
  provider: z.string().optional(),
});

export class AssetService {
  async register(input: {
    workspaceId: string;
    projectId: string;
    key: string;
    body: Uint8Array;
    contentType: string;
    provenance: AssetProvenanceRecord;
  }): Promise<{key: string; sha256: string}> {
    const sha256 = sha256Hex(input.body);
    assertCommercialAsset(input.provenance);
    return {
      key: assetKey(input.workspaceId, input.projectId, 'asset', sha256),
      sha256,
    };
  }
}

export function provenanceFromRecord(record: {
  origin: string;
  sourceUrl: string | null;
  license: string;
  attribution: string | null;
  prompt?: string | null;
  estimatedCostUsd?: string | null;
  provider?: string;
}): AssetProvenanceRecord {
  return {
    origin: record.origin as AssetProvenanceRecord['origin'],
    sourceUrl: record.sourceUrl,
    license: record.license,
    attribution: record.attribution,
    sha256: null,
    prompt: record.prompt,
    estimatedCostUsd: record.estimatedCostUsd,
    provider: record.provider,
  };
}

export {ALLOWED_LICENSES, assetKey, hashText, sha256Hex};
export type {AssetProvenanceRecord};
