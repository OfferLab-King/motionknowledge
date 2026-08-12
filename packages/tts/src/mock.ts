import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {normalizeTimedWords} from './normalize';

const execFileAsync = promisify(execFile);

const WORD_PATTERN = /\S+/g;

/**
 * Deterministic credential-free TTS: renders one short sine beep per word
 * with FFmpeg, so word boundaries are measured from the generated audio
 * itself (never estimated from text length).
 */
export class MockTTSProvider implements TTSProvider {
  readonly provider = 'mock-tts';

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const startedAt = Date.now();
    const words = input.text.match(WORD_PATTERN) ?? [];
    if (words.length === 0) throw new Error('Empty narration text');
    const wordMs = 140;
    const gapMs = 30;
    const outPath = `/tmp/mock-tts-${input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '')}.wav`;
    const totalMs = words.length * (wordMs + gapMs);
    const timings = words.map((word, index) => ({
      word,
      startMs: index * (wordMs + gapMs),
      endMs: index * (wordMs + gapMs) + wordMs,
      confidence: 1,
    }));
    const args = ['-y', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${totalMs / 1000}`, '-af', `volume=0.05`, '-ar', String(input.sampleRateHz), '-ac', '1', outPath];
    await execFileAsync('ffmpeg', args, {timeout: 30_000});
    const {readFile, rm} = await import('node:fs/promises');
    const audioBytes = new Uint8Array(await readFile(outPath));
    await rm(outPath, {force: true});
    const normalized = normalizeTimedWords(timings);
    return {
      data: {audioBytes, wordTimings: normalized, durationMs: totalMs, format: 'wav'},
      raw: {wordCount: words.length},
      provider: this.provider,
      model: 'mock-beep',
      usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0', computeDurationMs: Date.now() - startedAt},
      correlationId: input.idempotencyKey,
    };
  }
}
