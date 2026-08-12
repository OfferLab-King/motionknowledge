import {createDatabaseClient, type Database} from '@motionknowledge/database';
import {createStorageProvider} from '@motionknowledge/storage';
import {UsageLedgerImpl, type UsageLedger} from '@motionknowledge/usage';
import {ContentPipeline} from '@motionknowledge/content-engine';
import {ResearchService} from '@motionknowledge/research';
import {TTSService} from '@motionknowledge/tts';
import {MockTTSProvider} from '@motionknowledge/tts';
import {GoogleCloudTTSProvider} from '@motionknowledge/tts';
import {ElevenLabsProvider} from '@motionknowledge/tts';
import {MockProvider, OpenAIProvider, type LLMProvider, type TTSProvider, type StorageProvider} from '@motionknowledge/providers';
import {createLogger, type StructuredLogger} from '@motionknowledge/observability';
import type {JobQueue} from '@motionknowledge/jobs';
import {localStorageRoot} from './lib/paths';

export interface WorkerConfig {
  databaseUrl: string;
  storageDriver: 'local' | 's3';
  renderWidth: number;
  renderHeight: number;
  previewWidth: number;
  previewHeight: number;
  fps: 30;
  ttsProvider: 'mock' | 'google' | 'elevenlabs';
  ttsVoice: string;
  llmProvider: 'mock' | 'openai';
  llmModel: string;
  sampleRateHz: number;
}

export interface WorkerDeps {
  db: Database;
  config: WorkerConfig;
  llm: LLMProvider;
  tts: TTSProvider;
  storage: StorageProvider;
  usage: UsageLedger;
  contentPipeline: ContentPipeline;
  researchService: ResearchService;
  ttsService: TTSService;
  logger: StructuredLogger;
  queue: JobQueue;
}

export function resolveWorkerConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  return {
    databaseUrl: env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
    storageDriver: (env.STORAGE_DRIVER as 'local' | 's3' | undefined) ?? 'local',
    renderWidth: Number(env.RENDER_WIDTH ?? 1280),
    renderHeight: Number(env.RENDER_HEIGHT ?? 720),
    previewWidth: Number(env.PREVIEW_WIDTH ?? 640),
    previewHeight: Number(env.PREVIEW_HEIGHT ?? 360),
    fps: 30,
    ttsProvider: (env.TTS_PROVIDER as 'mock' | 'google' | 'elevenlabs' | undefined) ?? 'mock',
    ttsVoice: env.TTS_VOICE ?? 'en-US-Neural2-F',
    llmProvider: (env.LLM_PROVIDER as 'mock' | 'openai' | undefined) ?? 'mock',
    llmModel: env.LLM_MODEL ?? 'gpt-4o-mini',
    sampleRateHz: Number(env.TTS_SAMPLE_RATE ?? 24000),
  };
}

export function buildWorkerDeps(env: NodeJS.ProcessEnv): WorkerDeps {
  const config = resolveWorkerConfig(env);
  const {db} = createDatabaseClient({url: config.databaseUrl});
  const storage = createStorageProvider({driver: config.storageDriver, localRoot: localStorageRoot});
  const usage = new UsageLedgerImpl(db);
  const logger = createLogger((env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined) ?? 'info');

  let llm: LLMProvider;
  if (config.llmProvider === 'openai' && env.OPENAI_API_KEY) {
    llm = new OpenAIProvider({apiKey: env.OPENAI_API_KEY, model: config.llmModel});
  } else {
    llm = new MockProvider();
  }

  let tts: TTSProvider;
  if (config.ttsProvider === 'google' && env.GOOGLE_TTS_CREDENTIALS_JSON) {
    tts = new GoogleCloudTTSProvider({
      credentialsJson: env.GOOGLE_TTS_CREDENTIALS_JSON,
      voice: config.ttsVoice,
      languageCode: 'en-US',
    });
  } else if (config.ttsProvider === 'elevenlabs' && env.ELEVENLABS_API_KEY) {
    tts = new ElevenLabsProvider({
      apiKey: env.ELEVENLABS_API_KEY,
      voiceId: env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM',
      model: env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
    });
  } else {
    tts = new MockTTSProvider();
  }

  const researchService = new ResearchService({llm, usage});
  const contentPipeline = new ContentPipeline({llm, usage});
  const ttsService = new TTSService({
    tts,
    voice: config.ttsVoice,
    sampleRateHz: config.sampleRateHz,
    storage: {
      put: async (input) => {
        await storage.put(input);
        return {key: input.key, sha256: input.sha256};
      },
    },
  });
  return {db, config, llm, tts, storage, usage, contentPipeline, researchService, ttsService, logger, queue: undefined as unknown as JobQueue};
}

export function attachQueue(deps: WorkerDeps, queue: JobQueue): void {
  deps.queue = queue;
}
