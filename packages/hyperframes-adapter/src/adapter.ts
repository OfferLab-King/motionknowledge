import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import type {HyperFrameRequest, HyperFrameResult} from './types';
import {validateHyperFrameRequest} from './validate';

const execFileAsync = promisify(execFile);

export function buildDockerArgs(request: HyperFrameRequest, paths?: {
  inputDir: string;
  outputDir: string;
}): string[] {
  const env = Object.entries(process.env).filter(([key]) =>
    /token|secret|authorization|api[_]?key|password/i.test(key),
  );
  if (env.length > 0) {
    throw new Error('Refusing to pass credential-bearing environment into render container');
  }
  const inputDir = paths?.inputDir ?? '/var/hyperframes/input';
  const outputDir = paths?.outputDir ?? '/var/hyperframes/out';
  return [
    'run',
    '--rm',
    '--network=none',
    '--read-only',
    '--tmpfs', '/tmp:size=256m',
    '--cpus=2',
    '--memory=2g',
    '--pids-limit=256',
    '--security-opt', 'no-new-privileges',
    '--cap-drop', 'ALL',
    '-v', `${inputDir}:/render/input:ro`,
    '-v', `${outputDir}:/render/out:rw`,
    '-e', `HYPERFRAME_FPS=${request.fps}`,
    '-e', `HYPERFRAME_DURATION_SECONDS=${request.durationSeconds}`,
    '-e', `HYPERFRAME_WIDTH=${request.width}`,
    '-e', `HYPERFRAME_HEIGHT=${request.height}`,
    request.dockerImage,
    '/render/entrypoint.sh',
  ];
}

export class HyperFramesAdapter {
  constructor(private readonly defaults: {dockerImage: string}) {}

  async render(request: HyperFrameRequest, paths: {inputDir: string; outputDir: string}): Promise<HyperFrameResult> {
    const validated = validateHyperFrameRequest(request);
    await mkdir(paths.outputDir, {recursive: true});
    await rm(join(paths.outputDir, 'video.mp4'), {force: true});
    const {execFileAsync} = await import('./exec');
    const args = buildDockerArgs(validated, paths);
    const timeoutMs = validated.timeoutSeconds * 1000;
    try {
      await execFileAsync('docker', args, {
        timeout: timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HyperFrames container render failed: ${message}`);
    }
    const outputPath = join(paths.outputDir, 'video.mp4');
    const bytes = new Uint8Array(await readFile(outputPath));
    const sha256 = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    const {probeVideo} = await import('./probe');
    const probe = await probeVideo(outputPath);
    return {
      schemaVersion: 1,
      sceneId: validated.sceneId,
      videoAssetKey: `hyperframes/${sha256.slice(0, 2)}/${sha256}.mp4`,
      videoSha256: sha256,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      durationSeconds: probe.durationSeconds,
      providerCostUsd: '0.02',
      probeJson: JSON.stringify(probe),
    };
  }
}

export async function writeRequestFile(request: HyperFrameRequest, variablesPath: string): Promise<void> {
  await writeFile(variablesPath, JSON.stringify({...request.variables, _meta: {
    fps: request.fps,
    durationSeconds: request.durationSeconds,
    width: request.width,
    height: request.height,
  }}, null, 2));
}
