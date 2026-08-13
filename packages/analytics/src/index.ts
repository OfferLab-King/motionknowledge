import {NoopAnalyticsAdapter, type AnalyticsAdapter} from './noop';
import type {AnalyticsEventPayload} from './events';

let adapter: AnalyticsAdapter = new NoopAnalyticsAdapter();

export function setAnalyticsAdapter(next: AnalyticsAdapter): void {
  adapter = next;
}

export function track(payload: AnalyticsEventPayload): void {
  try {
    void adapter.track(payload);
  } catch {
    // never block the product on analytics
  }
}

export * from './events';
export * from './noop';
