import {HyperFrameRequestV1, type HyperFrameRequest} from './types';

export function validateHyperFrameRequest(input: unknown): HyperFrameRequest {
  return HyperFrameRequestV1.parse(input);
}
