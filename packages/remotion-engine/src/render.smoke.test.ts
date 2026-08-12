import {describe, expect, it} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {renderProject} from './render';
import {probeVideo} from './probe';
import {RenderManifestV1} from '@motionknowledge/schemas';

const smokeManifest = RenderManifestV1.parse(
  JSON.parse(
    await import('node:fs/promises').then(async ({readFile}) =>
      readFile(new URL('../fixtures/smoke-manifest.json', import.meta.url), 'utf8'),
    ),
  ),
);

async function tempPath(name: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mk-smoke-'));
  return join(dir, name);
}

describe('remotion render smoke test', () => {
  it('renders a valid H.264 MP4 from an immutable manifest', async () => {
    const output = await renderProject(smokeManifest, await tempPath('smoke.mp4'));
    const probe = await probeVideo(output.path);
    expect(probe).toMatchObject({width: 640, height: 360, videoCodec: 'h264'});
    expect(probe.durationSeconds).toBeGreaterThan(4.8);
    const {rm} = await import('node:fs/promises');
    await rm(join(output.path), {force: true});
  }, 300_000);
});
