import {describe, expect, it} from 'vitest';
import {assertCommercialAsset} from './policy';
import {sha256Hex, assetKey, hashText} from './hash';

describe('commercial asset provenance policy', () => {
  it('rejects an external asset with incomplete provenance', () => {
    expect(() =>
      assertCommercialAsset({
        origin: 'stock',
        sourceUrl: null,
        license: 'unknown',
      }),
    ).toThrow('Commercial asset provenance incomplete');
  });

  it('rejects an unknown external license', () => {
    expect(() =>
      assertCommercialAsset({
        origin: 'licensed',
        sourceUrl: 'https://example.com/asset.jpg',
        license: 'unknown',
      }),
    ).toThrow('Commercial asset license not allowlisted');
  });

  it('accepts generated local assets', () => {
    expect(() =>
      assertCommercialAsset({origin: 'generated', sourceUrl: null, license: 'local-generated'}),
    ).not.toThrow();
  });
});

describe('asset hashing', () => {
  it('produces stable sha256 and content-addressed keys', () => {
    const bytes = new TextEncoder().encode('discount factor table');
    const hash = sha256Hex(bytes);
    expect(hash).toHaveLength(64);
    expect(hashText('discount factor table')).toBe(hash);
    expect(assetKey('ws', 'proj', 'narration', hash)).toContain(hash);
    expect(assetKey('ws', 'proj', 'narration', hash)).toContain('ws/proj/');
  });
});
