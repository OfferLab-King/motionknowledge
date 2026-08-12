import {beforeAll, describe, expect, it} from 'vitest';
import {mkdtemp, copyFile, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileAsync} from './exec';
import {HyperFramesAdapter} from './adapter';
import {validateHyperFrameRequest} from './validate';

const runSmoke = process.env.RUN_HYPERFRAMES_SMOKE === '1';

describe.skipIf(!runSmoke)('hyperframes container integration', () => {
  beforeAll(async () => {
    await execFileAsync('docker', ['build', '-t', 'motionknowledge-hyperframes:0.7.107', new URL('../../../docker/hyperframes/', import.meta.url).pathname], {timeout: 600_000});
  }, 620_000);

  it('renders a specialist clip in a locked container and returns an asset manifest', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hyperframes-'));
    const inputDir = join(dir, 'input');
    const outputDir = join(dir, 'out');
    const {mkdir} = await import('node:fs/promises');
    await mkdir(inputDir, {recursive: true});
    const fixturePath = join(new URL('../fixtures/', import.meta.url).pathname, 'discount-factor-curve.html');
    await copyFile(fixturePath, join(inputDir, 'scene.html'));

    const request = validateHyperFrameRequest({
      schemaVersion: 1,
      sceneId: 'scene-discount-curve',
      projectId: '22222222-2222-2222-2222-222222222222',
      workspaceId: '11111111-1111-1111-1111-111111111111',
      htmlAssetKey: 'hyperframes/discount-factor-curve.html',
      variables: {rate: 0.1},
      width: 1280,
      height: 720,
      fps: 30,
      durationSeconds: 3,
      timeoutSeconds: 120,
      dockerImage: 'motionknowledge-hyperframes:0.7.107',
    });

    const adapter = new HyperFramesAdapter({dockerImage: 'motionknowledge-hyperframes:0.7.107'});
    const result = await adapter.render(request, {inputDir, outputDir});
    expect(result.videoSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.durationSeconds).toBeGreaterThan(2.5);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(result.fps).toBeCloseTo(30, 0);

    const mp4 = new Uint8Array(await readFile(join(outputDir, 'video.mp4')));
    expect(mp4.length).toBeGreaterThan(1000);
    await rm(dir, {recursive: true, force: true});
  }, 300_000);
});
