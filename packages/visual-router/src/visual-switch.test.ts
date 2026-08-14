import {describe, expect, it} from 'vitest';
import {migrateVisualForScene, buildCatalogInstruction} from './visual-switch';
import type {VisualInstruction} from '@motionknowledge/schemas';

function catalogInstruction(visualId: string, data: unknown): VisualInstruction {
  return {
    type: 'catalog',
    schemaVersion: 1,
    intent: 'show',
    data: {visualId, title: 'T', data},
  } as unknown as VisualInstruction;
}

describe('visual switching for scenes', () => {
  it('reuses the payload when it is compatible with the new visual', () => {
    const current = catalogInstruction('process-flow', {title: 'Steps', steps: ['A', 'B']});
    const result = migrateVisualForScene(current, 'flow-chart');
    expect(result.migrated).toBe(false);
    expect(result.data).toMatchObject({title: 'Steps', steps: ['A', 'B']});
  });

  it('reuses chart payloads across compatible chart visuals', () => {
    const current = catalogInstruction('bar-chart', {title: 'Growth', series: [{label: 'A', value: 1}, {label: 'B', value: 2}]});
    const result = migrateVisualForScene(current, 'line-chart');
    expect(result.migrated).toBe(false);
    expect(result.data).toMatchObject({title: 'Growth', series: [{label: 'A', value: 1}, {label: 'B', value: 2}]});
  });

  it('strips unknown keys that the new schema does not accept', () => {
    const current = catalogInstruction('flow-chart', {title: 'X', steps: ['A'], branchLabels: ['yes'], extra: 'ignored'});
    const result = migrateVisualForScene(current, 'process-flow');
    expect(result.migrated).toBe(false);
    expect(result.data).toEqual({title: 'X', steps: ['A']});
  });

  it('falls back to the preview fixture when payloads are incompatible', () => {
    const current = catalogInstruction('number-counter', {title: 'N', value: 42, unit: '$', caption: 'c'});
    const result = migrateVisualForScene(current, 'process-flow');
    expect(result.migrated).toBe(true);
    expect((result.data as {steps?: string[]}).steps).toBeDefined();
  });

  it('accepts typed instructions as the source payload', () => {
    const current = {
      type: 'title-hero',
      schemaVersion: 1,
      intent: 'introduce',
      data: {title: 'Hello', subtitle: 'World', kicker: 'K'},
    } as unknown as VisualInstruction;
    const result = migrateVisualForScene(current, 'title-hero');
    expect(result.migrated).toBe(false);
    expect(result.data).toEqual({title: 'Hello', subtitle: 'World', kicker: 'K'});
  });

  it('rejects unknown visual ids', () => {
    expect(() => migrateVisualForScene(undefined, 'does-not-exist')).toThrow(/Unknown visual/);
  });

  it('builds a catalog instruction from a switch result', () => {
    const instruction = buildCatalogInstruction({visualId: 'process-flow', title: 'Loop', data: {steps: ['A']}});
    expect(instruction.type).toBe('catalog');
    const catalog = instruction as unknown as {data: {visualId: string; title: string; data: unknown}};
    expect(catalog.data.visualId).toBe('process-flow');
    expect(catalog.data.data).toEqual({steps: ['A']});
  });
});
