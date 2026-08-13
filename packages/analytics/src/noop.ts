import type {AnalyticsEventPayload} from './events';

export interface AnalyticsAdapter {
  track(payload: AnalyticsEventPayload): Promise<void> | void;
}

export class NoopAnalyticsAdapter implements AnalyticsAdapter {
  track(): void {
    // Analytics failures must never interrupt core generation or rendering.
  }
}
