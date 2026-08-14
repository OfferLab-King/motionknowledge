import type {z} from 'zod';
import type {Theme} from './theme';

export interface VisualComponentProps<T> {
  data: T;
  theme: Theme;
  durationInFrames: number;
}

export interface VisualDefinition<T = unknown> {
  id: string;
  group: string;
  intent: string;
  suitability: string[];
  avoidance: string[];
  schemaVersion: 1;
  engine: 'remotion';
  preview: string;
  /** Supported visual treatments for this component (see ThemeTokenSchema.visualLanguage). */
  variants?: ReadonlyArray<string>;
  propsSchema: z.ZodType<T>;
  component: React.ComponentType<VisualComponentProps<any>>;
}

export interface RouteDecision {
  engine: 'remotion' | 'hyperframes' | 'generated-still' | 'generated-video' | 'fallback';
  componentId: string | null;
  reason: string;
  score: number;
  expectedCostUsd: string;
  schemaVersion: 1;
}
