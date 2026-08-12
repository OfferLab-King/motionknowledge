import {z} from 'zod';
import type {ProviderResult} from './llm';
import type {TimedWord} from '@motionknowledge/schemas';

export interface SynthesizeInput {
  text: string;
  voice: string;
  sampleRateHz: number;
  idempotencyKey: string;
}

export interface SynthesizedAudio {
  audioBytes: Uint8Array;
  wordTimings: TimedWord[];
  durationMs: number;
  format: 'mp3' | 'wav' | 'ogg';
}

export interface TTSProvider {
  synthesize(input: SynthesizeInput): Promise<ProviderResult<SynthesizedAudio>>;
}

export const TTSProviderCapabilitiesSchema = z.object({
  name: z.string(),
  supportsWordTimings: z.boolean(),
  premium: z.boolean(),
  maxTextLength: z.number().int().positive(),
  sampleRates: z.array(z.number().int()),
});

export type TTSProviderCapabilities = z.infer<typeof TTSProviderCapabilitiesSchema>;
