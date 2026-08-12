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
    const wordTimings = characters
      .map((char, index) => ({
        word: char,
        startMs: Math.round((alignment?.character_start_times_seconds?.[index] ?? 0) * 1000),
        endMs: Math.round((alignment?.character_end_times_seconds?.[index] ?? 0) * 1000) + 1,
        confidence: 0.98,
      }))
      .filter((entry) => entry.word.trim().length > 0);
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
