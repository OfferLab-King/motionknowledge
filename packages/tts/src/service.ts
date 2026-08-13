import type {TTSManifest} from '@motionknowledge/schemas';
import type {LLMProvider, SynthesizeInput, TTSProvider as TTSProviderContract} from '@motionknowledge/providers';
import {MockTTSProvider} from './mock';

export interface TTSServiceOptions {
  tts: TTSProviderContract;
  voice: string;
  sampleRateHz: number;
  storage: {
    put(input: {key: string; body: Uint8Array; contentType: string; sha256: string}): Promise<{key: string; sha256: string}>;
  };
}

export class TTSService {
  constructor(private readonly options: TTSServiceOptions) {}

  async synthesizeScene(input: {
    sceneId: string;
    sceneVersionId: string;
    narration: string;
    projectId: string;
    workspaceId: string;
    idempotencyKey: string;
    voice?: string;
  }): Promise<{
    audioAssetKey: string;
    wordTimings: TTSManifest['scenes'][number]['wordTimings'];
    durationMs: number;
    provider: string;
  }> {
    const synthesizeInput: SynthesizeInput = {
      text: input.narration,
      voice: input.voice ?? this.options.voice,
      sampleRateHz: this.options.sampleRateHz,
      idempotencyKey: input.idempotencyKey,
    };
    const result = await this.options.tts.synthesize(synthesizeInput);
    const sha256 = await import('node:crypto').then(({createHash}) =>
      createHash('sha256').update(Buffer.from(result.data.audioBytes)).digest('hex'),
    );
    const key = `${input.workspaceId}/${input.projectId}/narration/${sha256.slice(0, 2)}/${sha256}.wav`;
    await this.options.storage.put({
      key,
      body: result.data.audioBytes,
      contentType: `audio/${result.data.format}`,
      sha256,
    });
    return {
      audioAssetKey: key,
      wordTimings: result.data.wordTimings,
      durationMs: result.data.durationMs,
      provider: result.provider,
    };
  }
}

export function createTTSService(options: TTSServiceOptions): TTSService {
  return new TTSService(options);
}

export {MockTTSProvider};
export {GoogleCloudTTSProvider} from './google';
export {ElevenLabsProvider} from './elevenlabs';
