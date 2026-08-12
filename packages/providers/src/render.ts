import type {RenderManifest, RenderResult, QAResult} from '@motionknowledge/schemas';
import type {ProviderResult} from './llm';

export interface RenderInput {
  manifest: RenderManifest;
  kind: 'PREVIEW' | 'FINAL';
}

export interface RenderProvider {
  render(input: RenderInput): Promise<ProviderResult<RenderResult>>;
}

export interface RenderQaInput {
  manifest: RenderManifest;
  result: RenderResult;
}

export interface RenderQaProvider {
  evaluate(input: RenderQaInput): Promise<ProviderResult<QAResult>>;
}
