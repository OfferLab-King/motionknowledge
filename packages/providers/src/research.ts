import type {ResearchDocument} from '@motionknowledge/schemas';
import type {LLMProvider} from './llm';

export interface ResearchInput {
  topic: string;
  audienceLevel: 'beginner' | 'intermediate' | 'advanced';
  maxSources: number;
  language: string;
}

export interface ResearchProvider {
  research(input: ResearchInput): Promise<ResearchDocument>;
}

export interface ResearchProviderWithLLM extends ResearchProvider {
  llm: LLMProvider;
}
