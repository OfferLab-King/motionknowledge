import type {ProviderResult, SynthesizeInput, TTSProvider} from '@motionknowledge/providers';
import {GoogleCloudTTSProvider} from './google';
import {ElevenLabsProvider} from './elevenlabs';
import {MockTTSProvider} from './mock';

/** Pure classification of a voice id → provider kind. */
export function voiceProviderKind(voice: string): 'google' | 'elevenlabs' | 'mock' {
  // Google voice ids look like en-US-Neural2-A / es-ES-Standard-B.
  if (/^[a-z]{2,3}-[A-Z]{2}-(Neural2|Wavenet|Standard|Studio|News|Polyglot)-/.test(voice)) return 'google';
  // ElevenLabs voice ids are opaque alphanumeric strings of 10+ chars.
  if (/^[A-Za-z0-9]{10,}$/.test(voice)) return 'elevenlabs';
  return 'mock';
}

export interface MultiVoiceTTSConfig {
  google?: {credentialsJson: string};
  elevenlabs?: {apiKey: string; model?: string};
  useMock?: boolean;
  defaultVoice?: string;
}

/**
 * Routes each synthesis to the provider that owns the chosen voice: Google
 * voice ids go to Google Cloud TTS, ElevenLabs ids to ElevenLabs, and macOS
 * names to the on-device mock. Providers are constructed lazily and cached per
 * voice id.
 */
export class MultiVoiceTTSService implements TTSProvider {
  readonly provider = 'tts-router';
  readonly model = 'multi-voice';
  private readonly cache = new Map<string, TTSProvider>();

  constructor(private readonly config: MultiVoiceTTSConfig) {}

  async synthesize(input: SynthesizeInput): Promise<ProviderResult<{audioBytes: Uint8Array; wordTimings: import('@motionknowledge/schemas').TimedWord[]; durationMs: number; format: 'mp3' | 'wav' | 'ogg'}>> {
    const voice = input.voice ?? this.config.defaultVoice ?? 'Samantha';
    const provider = this.providerFor(voice);
    return provider.synthesize({...input, voice});
  }

  providerFor(voice: string): TTSProvider {
    const cached = this.cache.get(voice);
    if (cached) return cached;
    const provider = this.build(voice);
    this.cache.set(voice, provider);
    return provider;
  }

  private build(voice: string): TTSProvider {
    const kind = voiceProviderKind(voice);
    if (kind === 'google' && this.config.google) {
      return new GoogleCloudTTSProvider({
        credentialsJson: this.config.google.credentialsJson,
        voice,
        languageCode: voice.slice(0, 5),
      });
    }
    if (kind === 'elevenlabs' && this.config.elevenlabs) {
      return new ElevenLabsProvider({
        apiKey: this.config.elevenlabs.apiKey,
        voiceId: voice,
        model: this.config.elevenlabs.model ?? 'eleven_multilingual_v2',
      });
    }
    // Unknown or unconfigured provider: fall back to on-device synthesis so
    // narration never silently fails.
    return new MockTTSProvider();
  }
}

/** Build the router from environment variables (shared by worker and web). */
export function createMultiVoiceTTSFromEnv(env: Record<string, string | undefined>): MultiVoiceTTSService {
  return new MultiVoiceTTSService({
    google: env.GOOGLE_TTS_CREDENTIALS_JSON ? {credentialsJson: env.GOOGLE_TTS_CREDENTIALS_JSON} : undefined,
    elevenlabs: env.ELEVENLABS_API_KEY ? {apiKey: env.ELEVENLABS_API_KEY, model: env.ELEVENLABS_MODEL} : undefined,
    useMock: true,
    defaultVoice: env.TTS_VOICE ?? 'Samantha',
  });
}
