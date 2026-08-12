import {describe, expect, it} from 'vitest';
import {buildDockerArgs} from './adapter';
import {validateHyperFrameRequest} from './validate';

const request = validateHyperFrameRequest({
  schemaVersion: 1,
  sceneId: 'scene-discount-curve',
  projectId: '22222222-2222-2222-2222-222222222222',
  workspaceId: '11111111-1111-1111-1111-111111111111',
  htmlAssetKey: '11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/asset/00/discount-factor-curve.html',
  variables: {rate: 0.1},
  durationSeconds: 3,
});

describe('hyperframes sandbox policy', () => {
  it('launches specialist rendering without network or credentials', () => {
    const args = buildDockerArgs(request);
    expect(args).toContain('--network=none');
    expect(args).toContain('--read-only');
    expect(args.join(' ')).not.toContain('OPENAI_API_KEY');
    expect(args.join(' ')).not.toContain('secret');
  });

  it('caps resources and privileges', () => {
    const args = buildDockerArgs(request);
    expect(args).toContain('--cpus=2');
    expect(args).toContain('--memory=2g');
    expect(args).toContain('--pids-limit=256');
    expect(args).toContain('--cap-drop');
  });

  it('rejects out-of-bound requests', () => {
    expect(() =>
      validateHyperFrameRequest({
        ...request,
        durationSeconds: 60,
      }),
    ).toThrow();
    expect(() =>
      validateHyperFrameRequest({
        ...request,
        width: 8192,
      }),
    ).toThrow();
  });
});
