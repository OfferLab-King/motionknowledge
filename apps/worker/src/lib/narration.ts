import {mkdtemp, rm, writeFile, readFile, copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {RenderManifest} from '@motionknowledge/schemas';
import {attachNarrationToVideo} from '@motionknowledge/audio';
import type {WorkerDeps} from '../deps';

export async function attachNarration(deps: WorkerDeps, manifest: RenderManifest, videoPath: string, outputPath: string): Promise<{narrationTracks: number}> {
  const scratch = await mkdtemp(join(tmpdir(), 'mk-narr-'));
  const tracks: Array<{path: string; offsetMs: number}> = [];
  try {
    for (const scene of manifest.scenes) {
      if (!scene.narrationAudioKey) continue;
      const bytes = await deps.storage.get(scene.narrationAudioKey);
      const ext = scene.narrationAudioKey.endsWith('.mp3') ? 'mp3' : scene.narrationAudioKey.endsWith('.ogg') ? 'ogg' : 'wav';
      const path = join(scratch, `narration-${scene.sceneVersionId.replace(/[^a-zA-Z0-9_-]/g, '-')}.${ext}`);
      await writeFile(path, Buffer.from(bytes));
      tracks.push({path, offsetMs: scene.narrationStartMs + Math.round((scene.startFrame / manifest.fps) * 1000)});
    }
    await attachNarrationToVideo({videoPath, narrationTracks: tracks, outputPath});
  } finally {
    await rm(scratch, {recursive: true, force: true});
  }
  return {narrationTracks: tracks.length};
}

export async function writeLocalFile(path: string, bytes: Uint8Array): Promise<void> {
  await writeFile(path, Buffer.from(bytes));
}

export async function copyLocalFile(from: string, to: string): Promise<void> {
  await copyFile(from, to);
}

export async function readLocalFile(path: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path));
}
