import {describe, expect, it} from 'vitest';
import {visualRouter} from './router';
import {SceneV1, type Scene} from '@motionknowledge/schemas';

function makeScene(visual: unknown, overrides: Record<string, unknown> = {}): Scene {
  return SceneV1.parse({
    schemaVersion: 1,
    id: 'scene-1',
    sceneVersionId: 'scene-version-1',
    index: 0,
    title: 'Cash flow timeline',
    narration: 'Here are the expected cash flows.',
    durationSeconds: 18,
    claimIds: ['claim-1'],
    chapterId: 'chapter-1',
    visual,
    provider: {provider: 'mock', model: 'mock-dcf', costUsd: '0', durationMs: 0},
    inputHash: 'a'.repeat(64),
    ...overrides,
  });
}

describe('visual routing policy', () => {
  it('prefers a registered diagram over generated media', () => {
    const cashflowScene = makeScene({
      type: 'cashflow-timeline',
      schemaVersion: 1,
      intent: 'explain',
      data: {
        title: 'Cash flows',
        periods: [
          {year: 0, label: 'Year 0', amount: -100, displayAmount: '−$100', type: 'outflow'},
          {year: 1, label: 'Year 1', amount: 30, displayAmount: '$30', type: 'inflow'},
        ],
      },
    });
    expect(visualRouter.route(cashflowScene, {durationSeconds: 18, hasApprovedAssets: false, hasLicensedAssets: false, language: 'en'}).engine).toBe('remotion');
    expect(visualRouter.route(cashflowScene, {durationSeconds: 18, hasApprovedAssets: false, hasLicensedAssets: false, language: 'en'}).componentId).toBe('cashflow-timeline');
  });

  it('routes catalog instructions through the registry', () => {
    const scene = makeScene({
      type: 'catalog',
      schemaVersion: 1,
      intent: 'show',
      data: {visualId: 'step-by-step-calculation', title: 'PV step by step', data: {}},
    });
    const decision = visualRouter.route(scene, {durationSeconds: 20, hasApprovedAssets: false, hasLicensedAssets: false, language: 'en'});
    expect(decision.engine).toBe('remotion');
    expect(decision.componentId).toBe('step-by-step-calculation');
  });

  it('routes specialist scenes to the sandboxed engine', () => {
    const scene = makeScene({
      type: 'hyperframes',
      schemaVersion: 1,
      intent: 'animate',
      data: {title: 'Discount factor curve', htmlAssetKey: 'ws/proj/asset/x', variables: {}},
    });
    const decision = visualRouter.route(scene, {durationSeconds: 12, hasApprovedAssets: false, hasLicensedAssets: false, language: 'en'});
    expect(decision.engine).toBe('hyperframes');
  });

  it('falls back to an explicit component when nothing matches', () => {
    const scene = makeScene({
      type: 'catalog',
      schemaVersion: 1,
      intent: 'show',
      data: {visualId: 'does-not-exist', title: 'x', data: {}},
    });
    const decision = visualRouter.route(scene, {durationSeconds: 12, hasApprovedAssets: false, hasLicensedAssets: false, language: 'en'});
    expect(decision.engine).toBe('fallback');
    expect(decision.componentId).toBe('definition-card');
  });
});
