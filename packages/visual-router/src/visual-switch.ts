import {getVisualDefinition, visualFixtures} from '@motionknowledge/visual-library';
import type {VisualInstruction} from '@motionknowledge/schemas';

export interface VisualSwitchResult {
  visualId: string;
  data: unknown;
  migrated: boolean;
}

/**
 * Compute the data payload for a scene whose visual is being switched to a
 * new catalog visual id. Reuses the current payload when it is compatible with
 * the new component's schema; otherwise falls back to the component's preview
 * fixture. The result is data-only; the caller builds the catalog instruction.
 */
export function migrateVisualForScene(current: VisualInstruction | undefined, newVisualId: string): VisualSwitchResult {
  const definition = getVisualDefinition(newVisualId);
  if (!definition) throw new Error(`Unknown visual id: ${newVisualId}`);
  const currentData = extractScenePayload(current);
  if (currentData !== undefined) {
    const parsed = definition.propsSchema.safeParse(currentData);
    if (parsed.success) {
      return {visualId: newVisualId, data: parsed.data, migrated: false};
    }
  }
  const fixture = visualFixtures[newVisualId];
  if (fixture === undefined) throw new Error(`No fixture for visual id: ${newVisualId}`);
  const parsedFixture = definition.propsSchema.parse(fixture);
  return {visualId: newVisualId, data: parsedFixture, migrated: true};
}

function extractScenePayload(instruction: VisualInstruction | undefined): unknown {
  if (!instruction) return undefined;
  if (instruction.type === 'catalog') {
    return (instruction.data as {data?: unknown}).data;
  }
  return instruction.data;
}

/** Build a catalog visual instruction for a switched visual. */
export function buildCatalogInstruction(input: {visualId: string; title: string; data: unknown}): VisualInstruction {
  return {
    type: 'catalog',
    schemaVersion: 1,
    intent: 'show',
    data: {visualId: input.visualId, title: input.title, data: input.data},
  } as unknown as VisualInstruction;
}
