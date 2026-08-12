import {describe, expect, it} from 'vitest';
import catalogJson from '../visuals/catalog.json';
import {VisualCatalogSchema} from './catalog.schema';
import {visualRegistry, getVisualDefinition} from './registry';
import {visualFixtures} from './fixtures';

describe('visual catalog integrity', () => {
  it('maps every catalog item to a component and schema', () => {
    const catalog = VisualCatalogSchema.parse(catalogJson);
    for (const item of catalog) {
      const definition = visualRegistry[item.id];
      expect(definition).toBeDefined();
      expect(definition!.propsSchema).toBeDefined();
      expect(item.preview).toMatch(/^fixture:/);
    }
  });

  it('registers every preview fixture and parses it against its schema', () => {
    const catalog = VisualCatalogSchema.parse(catalogJson);
    for (const item of catalog) {
      const fixtureKey = item.preview.replace(/^fixture:/, '');
      expect(visualFixtures[fixtureKey]).toBeDefined();
      const definition = getVisualDefinition(item.id);
      expect(() => definition!.propsSchema.parse(visualFixtures[fixtureKey])).not.toThrow();
    }
  });

  it('keeps the registry free of unknown visual ids', () => {
    for (const id of Object.keys(visualRegistry)) {
      expect(catalogJson.some((item) => item.id === id)).toBe(true);
    }
  });
});
