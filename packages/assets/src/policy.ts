export const ALLOWED_LICENSES: ReadonlyArray<string> = [
  'local-generated',
  'supplied-material',
  'link-only',
  'apache-2.0',
  'mit',
  'remotion-license',
  'hyperframes-apache-2.0',
  'openai-terms',
  'google-cloud-terms',
  'elevenlabs-terms',
  'cc-by-4.0',
  'public-domain',
];

export type AssetOrigin = 'supplied' | 'research' | 'generated' | 'stock' | 'licensed' | 'derived';

export interface CommercialAssetInput {
  origin: AssetOrigin;
  sourceUrl: string | null;
  license: string;
  attribution?: string | null;
}

export interface AssetProvenanceRecord extends CommercialAssetInput {
  sha256: string | null;
  prompt?: string | null;
  estimatedCostUsd?: string | null;
  provider?: string;
}

export function isAllowlistedLicense(license: string): boolean {
  return ALLOWED_LICENSES.includes(license);
}

export function assertCommercialAsset(input: CommercialAssetInput): void {
  const external = input.origin === 'stock' || input.origin === 'licensed';
  if (external) {
    if (!input.sourceUrl) {
      throw new Error('Commercial asset provenance incomplete: external assets require a source URL');
    }
    if (!isAllowlistedLicense(input.license)) {
      throw new Error(`Commercial asset license not allowlisted: ${input.license}`);
    }
  } else if (!isAllowlistedLicense(input.license)) {
    throw new Error(`Unknown license not allowlisted for origin ${input.origin}`);
  }
  if (input.origin === 'supplied' && input.license !== 'supplied-material') {
    throw new Error('Supplied materials must be marked as supplied-material');
  }
}
