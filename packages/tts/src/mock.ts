import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, rm, writeFile, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {normalizeTimedWords} from './normalize';

const execFileAsync = promisify(execFile);

const WORD_PATTERN = /\S+/g;
const GAP_MS = 50;

interface SpokenWord {
  word: string;
  path: string;
  durationMs: number;
  usedSpeech: boolean;
}

async function probeDurationMs(path: string): Promise<number> {
  const {stdout} = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  return Math.round(Number(stdout.trim()) * 1000);
}

/**
 * Deterministic credential-free TTS. When the macOS speech synthesizer (`say`)
 * is available, each word is spoken and its duration is MEASURED from the real
 * audio (never estimated); words are then concatenated with a fixed gap, so
 * word timings are exact by construction. On platforms without `say` (Linux,
 * CI) a short sine beep per word is used as the fallback.
 */
export class MockTTSProvider implements TTSProvider {
  readonly provider = 'mock-tts';

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const startedAt = Date.now();
    const words = input.text.match(WORD_PATTERN) ?? [];
    if (words.length === 0) throw new Error('Empty narration text');

    const dir = await mkdtemp(join(tmpdir(), 'mock-tts-'));
    try {
      const spoken = await this.speakWords(words, input.sampleRateHz, dir);
      const usedSpeech = spoken.some((w) => w.usedSpeech);
      const outPath = join(dir, 'narration.wav');
      await this.assemble(spoken, outPath, input.sampleRateHz);

      const timings: Array<{word: string; startMs: number; endMs: number; confidence: number | null}> = [];
      let cursor = 0;
      for (const item of spoken) {
        timings.push({word: item.word, startMs: cursor, endMs: cursor + item.durationMs, confidence: usedSpeech ? null : 1});
        cursor += item.durationMs + GAP_MS;
      }
      const normalized = normalizeTimedWords(timings);
      const audioBytes = new Uint8Array(await readFile(outPath));
      return {
        data: {audioBytes, wordTimings: normalized, durationMs: cursor, format: 'wav'},
        raw: {wordCount: words.length, mode: usedSpeech ? 'macos-say' : 'beep'},
        provider: this.provider,
        model: usedSpeech ? 'say-samantha' : 'mock-beep',
        usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0', computeDurationMs: Date.now() - startedAt},
        correlationId: input.idempotencyKey,
      };
    } finally {
      await rm(dir, {recursive: true, force: true});
    }
  }

  private async speakWords(words: string[], sampleRateHz: number, dir: string): Promise<SpokenWord[]> {
    const sayAvailable = await hasSay();
    const spoken: SpokenWord[] = [];
    const batchSize = 4;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (word, offset) => {
          const index = i + offset;
          const wavPath = join(dir, `w${index}.wav`);
          if (sayAvailable) {
            try {
              const aiffPath = join(dir, `w${index}.aiff`);
              await execFileAsync('say', ['-v', 'Samantha', '-r', '175', '-o', aiffPath, word], {timeout: 20_000});
              await execFileAsync('ffmpeg', ['-y', '-i', aiffPath, '-ar', String(sampleRateHz), '-ac', '1', '-c:a', 'pcm_s16le', wavPath], {timeout: 20_000});
              const durationMs = await probeDurationMs(wavPath);
              if (durationMs > 0) return {word, path: wavPath, durationMs, usedSpeech: true};
            } catch {
              // fall through to beep for this word
            }
          }
          await this.synthesizeBeep(sampleRateHz, wavPath);
          const durationMs = await probeDurationMs(wavPath);
          return {word, path: wavPath, durationMs, usedSpeech: false};
        }),
      );
      spoken.push(...results);
    }
    return spoken;
  }

  private async synthesizeBeep(sampleRateHz: number, outPath: string): Promise<void> {
    const wordMs = 140;
    await execFileAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `sine=frequency=660:duration=${wordMs / 1000}`, '-af', 'volume=0.15', '-ar', String(sampleRateHz), '-ac', '1', outPath], {timeout: 30_000});
  }

  private async assemble(spoken: SpokenWord[], outPath: string, sampleRateHz: number): Promise<void> {
    const silencePath = join(outPath, '..', 'gap.wav');
    await execFileAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `anullsrc=r=${sampleRateHz}:cl=mono:d=${GAP_MS / 1000}`, '-c:a', 'pcm_s16le', silencePath], {timeout: 30_000});
    const listPath = join(outPath, '..', 'list.txt');
    const entries: string[] = [];
    for (const item of spoken) {
      entries.push(`file '${item.path}'`);
      entries.push(`file '${silencePath}'`);
    }
    await writeFile(listPath, entries.join('\n') + '\n');
    await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'pcm_s16le', outPath], {timeout: 60_000});
  }
}

let sayCheck: boolean | null = null;

async function hasSay(): Promise<boolean> {
  if (sayCheck !== null) return sayCheck;
  try {
    await execFileAsync('say', ['-v', 'Samantha', '-o', join(tmpdir(), 'say-probe.aiff'), 'test'], {timeout: 15_000});
    sayCheck = true;
  } catch {
    sayCheck = false;
  }
  return sayCheck;
}
