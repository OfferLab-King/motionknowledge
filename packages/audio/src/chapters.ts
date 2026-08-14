import {runFfmpeg} from './ffmpeg';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

export interface ChapterMetadata {
  title: string;
  startMs: number;
  endMs: number;
}

/**
 * Inject chapter metadata into an MP4 (viewable in players that support
 * chapters). Re-muxes with `-c copy`, so no re-encode happens.
 */
export async function injectChapterMetadata(input: {
  videoPath: string;
  chapters: ChapterMetadata[];
  outputPath: string;
}): Promise<void> {
  if (input.chapters.length === 0) {
    await runFfmpeg(['-y', '-i', input.videoPath, '-c', 'copy', '-movflags', '+faststart', input.outputPath]);
    return;
  }
  const scratch = await mkdtemp(join(tmpdir(), 'mk-chapters-'));
  try {
    const metaPath = join(scratch, 'chapters.ffmeta');
    const lines = [';FFMETADATA1'];
    for (const chapter of input.chapters) {
      lines.push(
        '[CHAPTER]',
        'TIMEBASE=1/1000',
        `START=${Math.max(0, Math.round(chapter.startMs))}`,
        `END=${Math.max(Math.round(chapter.startMs) + 1, Math.round(chapter.endMs))}`,
        `title=${chapter.title.replace(/[=\n;#\\]/g, ' ')}`,
      );
    }
    await writeFile(metaPath, lines.join('\n') + '\n');
    await runFfmpeg([
      '-y',
      '-i', input.videoPath,
      '-i', metaPath,
      '-map_metadata', '1',
      '-map', '0',
      '-c', 'copy',
      '-movflags', '+faststart',
      input.outputPath,
    ]);
  } finally {
    await rm(scratch, {recursive: true, force: true});
  }
}
