import type {Scene} from '@motionknowledge/schemas';
import {getVisualDefinition} from '@motionknowledge/visual-library';
import type {RouteContext, RouteDecision} from './policy';

const COST_BY_ENGINE: Readonly<Record<RouteDecision['engine'], string>> = {
  remotion: '0',
  hyperframes: '0.02',
  'generated-still': '0.01',
  'generated-video': '0.08',
  fallback: '0',
};

export interface VisualRouter {
  route(scene: Scene, context: RouteContext): RouteDecision;
}

export class VisualRouterImpl implements VisualRouter {
  route(scene: Scene, context: RouteContext): RouteDecision {
    const visual = scene.visual;

    if (visual.type === 'catalog') {
      const definition = getVisualDefinition(visual.data.visualId);
      if (definition) {
        const density = scene.durationSeconds > 24 ? 0.7 : 1;
        const score = Math.round(0.95 * density * 100) / 100;
        return {
          engine: 'remotion',
          componentId: definition.id,
          reason: 'registered-component: catalog visual maps to an approved component',
          score,
          expectedCostUsd: COST_BY_ENGINE.remotion,
          schemaVersion: 1,
        };
      }
      return this.fallback(scene, 'catalog visual id is not registered');
    }

    if (visual.type === 'hyperframes') {
      return {
        engine: 'hyperframes',
        componentId: null,
        reason: 'hyperframes: explicit sandboxed specialist scene',
        score: 0.8,
        expectedCostUsd: COST_BY_ENGINE.hyperframes,
        schemaVersion: 1,
      };
    }

    const typed: Record<string, string> = {
      'title-hero': 'title-hero',
      'cashflow-timeline': 'cashflow-timeline',
      formula: 'formula',
      comparison: 'comparison',
    };
    const candidateId = typed[visual.type];
    if (candidateId && getVisualDefinition(candidateId)) {
      return {
        engine: 'remotion',
        componentId: candidateId,
        reason: `registered-component: typed instruction ${visual.type} maps to an approved component`,
        score: 0.95,
        expectedCostUsd: COST_BY_ENGINE.remotion,
        schemaVersion: 1,
      };
    }

    return this.fallback(scene, `no registered component for instruction ${visual.type}`);
  }

  private fallback(scene: Scene, reason: string): RouteDecision {
    return {
      engine: 'fallback',
      componentId: 'definition-card',
      reason: `fallback: ${reason}`,
      score: 0.2,
      expectedCostUsd: COST_BY_ENGINE.fallback,
      schemaVersion: 1,
    };
  }
}

export const visualRouter: VisualRouter = new VisualRouterImpl();
