export const ANALYTICS_EVENTS = [
  'signup',
  'project_created',
  'artifact_generated',
  'preview_generated',
  'scene_regenerated',
  'render_requested',
  'render_completed',
  'export_downloaded',
  'upgrade_requested',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsEventPayload {
  event: AnalyticsEvent;
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}
