import type {Scene} from '@motionknowledge/schemas';
import {getVisualDefinition} from '@motionknowledge/visual-library';

export const ROUTE_PREFERENCE = [
  'registered-component',
  'approved-asset',
  'licensed-asset',
  'hyperframes',
  'generated-still',
  'generated-video',
  'fallback',
] as const;

export type RoutePreference = (typeof ROUTE_PREFERENCE)[number];

export interface RouteContext {
  durationSeconds: number;
  hasApprovedAssets: boolean;
  hasLicensedAssets: boolean;
  language: string;
  /** Chosen visual style; the router maps it to a component variant when the component declares one. */
  styleId?: string;
}

export interface RouteDecision {
  engine: 'remotion' | 'hyperframes' | 'generated-still' | 'generated-video' | 'fallback';
  componentId: string | null;
  reason: string;
  score: number;
  expectedCostUsd: string;
  schemaVersion: 1;
  styleId: string | null;
  variant: string | null;
}

const FALLBACK_COMPONENT = 'definition-card';

function sceneToCandidate(scene: Scene): {candidateId: string | null; instruction: string} {
  const visual = scene.visual;
  switch (visual.type) {
    case 'catalog':
      return {candidateId: visual.data.visualId, instruction: `catalog:${visual.data.visualId}`};
    case 'title-hero':
      return {candidateId: 'title-hero', instruction: 'title-hero'};
    case 'cashflow-timeline':
      return {candidateId: 'cashflow-timeline', instruction: 'cashflow-timeline'};
    case 'formula':
      return {candidateId: 'formula', instruction: 'formula'};
    case 'comparison':
      return {candidateId: 'comparison', instruction: 'comparison'};
    case 'hyperframes':
      return {candidateId: null, instruction: 'hyperframes'};
  }
}

function scoreFit(candidateId: string | null, instruction: string, scene: Scene): number {
  if (candidateId) return 0.95;
  if (instruction === 'hyperframes') return 0.8;
  return 0.3;
}
