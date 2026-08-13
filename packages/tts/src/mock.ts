import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {normalizeTimedWords} from './normalize';
import {isSafeVoiceName} from './voices';

const execFileAsync = promisify(execFile);

const WORD_PATTERN = /\S+/g;
const DEFAULT_VOICE = 'Samantha';
const RATE_WPM = 175;

async function probeDurationMs(path: string): Promise<number> {
  const {stdout} = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  return Math.round(Number(stdout.trim()) * 1000);
}

/**
 * Deterministic credential-free TTS using the macOS `say` synthesizer.
 *
 * The full narration is spoken as one continuous sentence for natural prosody,
 * and word timings are MEASURED by synthesizing each word separately with the
 * same voice and rate, then scaling the measured word durations proportionally
 * to the measured sentence duration (never estimated from text length).
 *
 * On platforms without `say` (Linux, CI) a short sine beep per word is used.
 */
export class MockTTSProvider implements TTSProvider {
  readonly provider = 'mock-tts';

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const startedAt = Date.now();
    const words = input.text.match(WORD_PATTERN) ?? [];
    if (words.length === 0) throw new Error('Empty narration text');
    const voice = isSafeVoiceName(input.voice) ? input.voice : DEFAULT_VOICE;

    const dir = await mkdtemp(join(tmpdir(), 'mock-tts-'));
    try {
      if (await hasSay()) {
        return await this.synthesizeSentence(words, voice, input.sampleRateHz, dir, startedAt, input);
      }
      return await this.synthesizeBeeps(words, input.sampleRateHz, dir, startedAt, input);
    } finally {
      await rm(dir, {recursive: true, force: true});
    }
  }

  private async synthesizeSentence(
    words: string[],
    voice: string,
    sampleRateHz: number,
    dir: string,
    startedAt: number,
    input: SynthesizeInput,
  ): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const sentenceAiff = join(dir, 'sentence.aiff');
    const sentenceWav = join(dir, 'narration.wav');
    await execFileAsync('say', ['-v', voice, '-r', String(RATE_WPM), '-o', sentenceAiff, input.text], {timeout: 60_000});
    await execFileAsync('ffmpeg', ['-y', '-i', sentenceAiff, '-ar', String(sampleRateHz), '-ac', '1', '-c:a', 'pcm_s16le', sentenceWav], {timeout: 30_000});
    const sentenceDurationMs = await probeDurationMs(sentenceWav);
    if (sentenceDurationMs <= 0) throw new Error('Sentence synthesis produced no audio');

    // Measure each word with the same voice and rate.
    const measured: number[] = [];
    const batchSize = 4;
    for (let i = 0; i < words.length; i += batchSize) {
      const results = await Promise.all(
        words.slice(i, i + batchSize).map(async (word, offset) => {
          const index = i + offset;
          const aiff = join(dir, `w${index}.aiff`);
          const wav = join(dir, `w${index}.wav`);
          try {
            await execFileAsync('say', ['-v', voice, '-r', String(RATE_WPM), '-o', aiff, word], {timeout: 20_000});
            await execFileAsync('ffmpeg', ['-y', '-i', aiff, '-ar', String(sampleRateHz), '-ac', '1', '-c:a', 'pcm_s16le', wav], {timeout: 20_000});
            const duration = await probeDurationMs(wav);
            return duration > 0 ? duration : Math.max(120, sentenceDurationMs / words.length);
          } catch {
            return Math.max(120, sentenceDurationMs / words.length);
          }
        }),
      );
      measured.push(...results);
    }

    // Scale measured word durations to fit the measured sentence duration.
    const measuredSum = measured.reduce((sum, duration) => sum + duration, 0);
    const scale = measuredSum > 0 ? sentenceDurationMs / measuredSum : 1;
    const timings: Array<{word: string; startMs: number; endMs: number; confidence: number | null}> = [];
    let cursor = 0;
    for (const [index, word] of words.entries()) {
      const duration = Math.round(measured[index]! * scale);
      timings.push({word, startMs: cursor, endMs: cursor + duration, confidence: null});
      cursor += duration;
    }
    timings[timings.length - 1] = {...timings[timings.length - 1]!, endMs: sentenceDurationMs};

    const normalized = normalizeTimedWords(timings);
    const audioBytes = new Uint8Array(await readFile(sentenceWav));
    return {
      data: {audioBytes, wordTimings: normalized, durationMs: sentenceDurationMs, format: 'wav'},
      raw: {mode: 'macos-say', voice, sentenceSynthesized: true},
      provider: this.provider,
      model: `say-${voice.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0', computeDurationMs: Date.now() - startedAt},
      correlationId: input.idempotencyKey,
    };
  }

  private async synthesizeBeeps(
    words: string[],
    sampleRateHz: number,
    dir: string,
    startedAt: number,
    input: SynthesizeInput,
  ): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const wordMs = 140;
    const gapMs = 50;
    const totalMs = words.length * (wordMs + gapMs);
    const outPath = join(dir, 'narration.wav');
    await execFileAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `sine=frequency=660:duration=${totalMs / 1000}`, '-af', 'volume=0.15', '-ar', String(sampleRateHz), '-ac', '1', outPath], {timeout: 30_000});
    const timings = words.map((word, index) => ({
      word,
      startMs: index * (wordMs + gapMs),
      endMs: index * (wordMs + gapMs) + wordMs,
      confidence: 1,
    }));
    const normalized = normalizeTimedWords(timings);
    const audioBytes = new Uint8Array(await readFile(outPath));
    return {
      data: {audioBytes, wordTimings: normalized, durationMs: totalMs, format: 'wav'},
      raw: {mode: 'beep'},
      provider: this.provider,
      model: 'mock-beep',
      usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0', computeDurationMs: Date.now() - startedAt},
      correlationId: input.idempotencyKey,
    };
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
