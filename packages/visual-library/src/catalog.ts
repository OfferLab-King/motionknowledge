import catalogJson from '../visuals/catalog.json';

/**
 * React-free catalog metadata view for server-side use (web API routes,
 * routing policy). Never imports components or Remotion; keep it that way.
 */
const VISUAL_IDS: ReadonlySet<string> = new Set(catalogJson.map((item) => item.id));

export function isRegisteredVisualId(id: string): boolean {
  return VISUAL_IDS.has(id);
}

export function listVisualIds(): string[] {
  return [...VISUAL_IDS];
}
