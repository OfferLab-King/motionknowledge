import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import type {RenderManifest} from '@motionknowledge/schemas';
import {RenderManifestV1} from '@motionknowledge/schemas';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {availableParallelism, tmpdir} from 'node:os';

export interface RenderOutput {
  path: string;
  sha256: string;
  byteCount: number;
}

export type RenderProgressCallback = (progress: number) => void;

const REMOTION_COMPOSITION = new URL('./ProjectComposition.tsx', import.meta.url).pathname;

export async function writeRenderEntry(manifest: RenderManifest, scratchDir: string): Promise<string> {
  await mkdir(scratchDir, {recursive: true});
  const manifestPath = join(scratchDir, 'render-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  const entryPath = join(scratchDir, 'render-entry.tsx');
  const entry = [
    `import {registerRoot, Composition} from 'remotion';`,
    `import {ProjectComposition} from ${JSON.stringify(REMOTION_COMPOSITION)};`,
    `import manifest from ${JSON.stringify(manifestPath)};`,
    `const Root = () => (`,
    `  <Composition id="ProjectComposition"`,
    `    component={() => <ProjectComposition manifest={manifest} />}`,
    `    durationInFrames={manifest.totalDurationInFrames} fps={manifest.fps}`,
    `    width={manifest.width} height={manifest.height} />`,
    `);`,
    `registerRoot(Root);`,
  ].join('\n');
  await writeFile(entryPath, entry);
  return entryPath;
}

export async function renderProject(
  manifest: RenderManifest,
  outputPath: string,
  onProgress?: RenderProgressCallback,
): Promise<RenderOutput> {
  RenderManifestV1.parse(manifest);
  await mkdir(dirname(outputPath), {recursive: true});
  const scratchDir = await mkdtemp(join(tmpdir(), 'mk-render-'));
  try {
    const entryPoint = await writeRenderEntry(manifest, scratchDir);
    const serveUrl = await bundle({entryPoint, webpackOverride: (config) => config});
    const composition = await selectComposition({serveUrl, id: 'ProjectComposition'});
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      concurrency: Math.min(4, availableParallelism()),
      onProgress: (progress) => onProgress?.(Math.round(progress.progress * 100)),
    });
    const bytes = await readFile(outputPath);
    return {
      path: outputPath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteCount: bytes.byteLength,
    };
  } finally {
    await rm(scratchDir, {recursive: true, force: true});
  }
}

export async function renderSceneStill(manifest: RenderManifest, frame: number, outputPath: string): Promise<RenderOutput> {
  RenderManifestV1.parse(manifest);
  await mkdir(dirname(outputPath), {recursive: true});
  const scratchDir = await mkdtemp(join(tmpdir(), 'mk-still-'));
  try {
    const entryPoint = await writeRenderEntry(manifest, scratchDir);
    const serveUrl = await bundle({entryPoint, webpackOverride: (config) => config});
    const composition = await selectComposition({serveUrl, id: 'ProjectComposition'});
    await renderStill({composition, serveUrl, output: outputPath, frame});
    const bytes = await readFile(outputPath);
    return {
      path: outputPath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteCount: bytes.byteLength,
    };
  } finally {
    await rm(scratchDir, {recursive: true, force: true});
  }
}

const SHOWCASE_ENTRY = new URL('./showcase-entry.tsx', import.meta.url).pathname;

/**
 * Render a deterministic style showcase still: the same sample explanation in
 * one style. Used by the style-matrix smoke test and for gallery thumbnails.
 */
export async function renderStyleShowcaseStill(styleId: string, outputPath: string, opts: {frame?: number; width?: number; height?: number} = {}): Promise<RenderOutput> {
  await mkdir(dirname(outputPath), {recursive: true});
  const scratchDir = await mkdtemp(join(tmpdir(), 'mk-showcase-'));
  try {
    const propsPath = join(scratchDir, 'showcase-props.json');
    await writeFile(propsPath, JSON.stringify({styleId, aspectRatio: '16:9'}));
    const entryPath = join(scratchDir, 'showcase-entry.tsx');
    const entry = [
      `import {registerRoot, Composition} from 'remotion';`,
      `import {StyleShowcase} from ${JSON.stringify(SHOWCASE_ENTRY)};`,
      `import props from ${JSON.stringify(propsPath)};`,
      `const Root = () => (`,
      `  <Composition id="StyleShowcase"`,
      `    component={() => <StyleShowcase styleId={props.styleId} aspectRatio={props.aspectRatio} />}`,
      `    durationInFrames={240} fps={30}`,
      `    width={${opts.width ?? 1280}} height={${opts.height ?? 720}} />`,
      `);`,
      `registerRoot(Root);`,
    ].join('\n');
    await writeFile(entryPath, entry);
    const serveUrl = await bundle({entryPoint: entryPath, webpackOverride: (config) => config});
    const composition = await selectComposition({serveUrl, id: 'StyleShowcase'});
    await renderStill({composition, serveUrl, output: outputPath, frame: opts.frame ?? 100});
    const bytes = await readFile(outputPath);
    return {
      path: outputPath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteCount: bytes.byteLength,
    };
  } finally {
    await rm(scratchDir, {recursive: true, force: true});
  }
}
