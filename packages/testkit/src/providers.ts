import {MockProvider} from '@motionknowledge/providers';
import {MockTTSProvider} from '@motionknowledge/tts';
import type {LLMProvider} from '@motionknowledge/providers';
import type {TTSProvider} from '@motionknowledge/providers';

export interface MockProviders {
  llm: LLMProvider;
  tts: TTSProvider;
}

export function createMockProviders(): MockProviders {
  return {
    llm: new MockProvider(),
    tts: new MockTTSProvider(),
  };
}
