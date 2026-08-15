import {ElevenLabsClient as ElevenLabs} from 'elevenlabs';
import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {normalizeTimedWords} from './normalize';

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  model: string;
}

export class ElevenLabsProvider implements TTSProvider {
  readonly provider = 'elevenlabs';
  private readonly client: ElevenLabs;

  constructor(private readonly config: ElevenLabsConfig) {
    this.client = new ElevenLabs({apiKey: config.apiKey});
  }

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const startedAt = Date.now();
    const timestamps = await this.client.textToSpeech.convertWithTimestamps(this.config.voiceId, {
      text: input.text,
      model_id: this.config.model,
      output_format: 'mp3_44100_128',
    });
    const audioBytes = new Uint8Array(Buffer.from(timestamps.audio_base64, 'base64'));
    const alignment = timestamps.alignment ?? timestamps.normalized_alignment;
    const characters = alignment?.characters ?? [];
    const starts = alignment?.character_start_times_seconds ?? [];
    const ends = alignment?.character_end_times_seconds ?? [];
    // Group characters into words (ElevenLabs reports per-character
    // alignment); word timing = first/last character of the word.
    const words: Array<{word: string; startMs: number; endMs: number}> = [];
    let current = '';
    let wordStart: number | null = null;
    let wordEnd = 0;
    for (let index = 0; index < characters.length; index++) {
      const char = characters[index] ?? '';
      const startMs = (starts?.[index] ?? 0) * 1000;
      const endMs = (ends?.[index] ?? 0) * 1000;
      if (char.trim().length === 0) {
        if (current.length > 0) {
          words.push({word: current, startMs: wordStart ?? 0, endMs: Math.max(wordEnd, (wordStart ?? 0) + 1)});
          current = '';
          wordStart = null;
        }
        continue;
      }
      if (!current) wordStart = startMs;
      current += char;
      wordEnd = endMs;
    }
    if (current.length > 0) {
      words.push({word: current, startMs: wordStart ?? 0, endMs: Math.max(wordEnd, (wordStart ?? 0) + 1)});
    }
    const wordTimings = words.map((word) => ({
      word: word.word,
      startMs: Math.round(word.startMs),
      endMs: Math.round(word.endMs),
      confidence: 0.98,
    }));
    const normalized = normalizeTimedWords(wordTimings);
    const durationMs = normalized.at(-1)?.endMs ?? 0;
    return {
      data: {audioBytes, wordTimings: normalized, durationMs, format: 'mp3'},
      raw: {characterCount: characters.length},
      provider: this.provider,
      model: this.config.model,
      usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0.03', computeDurationMs: Date.now() - startedAt},
      correlationId: input.idempotencyKey,
    };
  }
}
