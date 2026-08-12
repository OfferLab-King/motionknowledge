import {TextToSpeechClient, protos} from '@google-cloud/text-to-speech';
import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {normalizeTimedWords} from './normalize';

export interface GoogleTTSConfig {
  credentialsJson: string;
  voice: string;
  languageCode: string;
}

const WORD_PATTERN = /\S+/g;
const SSML_MARK = 1; // google.cloud.texttospeech.v1beta1.SynthesizeSpeechRequest.TimepointType.SSML_MARK

export class GoogleCloudTTSProvider implements TTSProvider {
  readonly provider = 'google-tts';
  private readonly client: TextToSpeechClient;

  constructor(private readonly config: GoogleTTSConfig) {
    this.client = new TextToSpeechClient({credentials: JSON.parse(config.credentialsJson)});
  }

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: ReturnType<typeof normalizeTimedWords>; durationMs: number; format: 'mp3' | 'wav' | 'ogg' }>> {
    const words = input.text.match(WORD_PATTERN) ?? [];
    if (words.length === 0) throw new Error('Empty narration text');
    const marks = input.text.replace(WORD_PATTERN, (match, offset) => `<mark name="w${offset}" />${match}`);
    const ssml = `<speak><p>${marks}</p></speak>`;
    const request = {
      input: {ssml},
      voice: {languageCode: this.config.languageCode, name: this.config.voice},
      audioConfig: {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        sampleRateHertz: input.sampleRateHz,
      },
      enableTimePointing: [SSML_MARK],
    } as unknown as protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest;
    const [response] = await this.client.synthesizeSpeech(request);
    const audioContent = response.audioContent ?? new Uint8Array(0);
    const audioBytes = typeof audioContent === "string" ? new Uint8Array(Buffer.from(audioContent, "base64")) : new Uint8Array(audioContent);
    const timepoints = (response as unknown as {timepoints?: Array<{markName?: string; timeSeconds?: number}>}).timepoints ?? [];
    const entries = timepoints
      .filter((tp) => tp.markName !== undefined && tp.timeSeconds !== undefined)
      .sort((a, b) => (a.timeSeconds ?? 0) - (b.timeSeconds ?? 0))
      .map((tp) => ({
        offset: Number(tp.markName),
        startMs: Math.round(Number(tp.timeSeconds) * 1000),
      }));
    const wordTimings = entries.map((entry, index) => ({
      word: words[index] ?? '',
      startMs: entry.startMs,
      endMs: index + 1 < entries.length ? entries[index + 1]!.startMs : entry.startMs + 250,
      confidence: 0.9,
    }));
    const normalized = normalizeTimedWords(wordTimings);
    const durationMs = normalized.at(-1)?.endMs ?? 0;
    return {
      data: {audioBytes, wordTimings: normalized, durationMs, format: 'mp3'},
      raw: {timepointCount: timepoints.length},
      provider: this.provider,
      model: this.config.voice,
      usage: {inputUnits: String(input.text.length), outputUnits: String(audioBytes.length), providerCostUsd: '0.004', computeDurationMs: 0},
      correlationId: input.idempotencyKey,
    };
  }
}
