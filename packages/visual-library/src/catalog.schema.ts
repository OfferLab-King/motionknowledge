import {z} from 'zod';

export const VisualCatalogSchema = z.array(
  z.object({
    id: z.string().min(1),
    group: z.enum([
      'typography',
      'explanation',
      'quantitative',
      'technical',
      'relationships',
      'assessment',
      'navigation',
    ]),
    intent: z.string().min(1),
    suitability: z.array(z.string()),
    avoidance: z.array(z.string()),
    schemaVersion: z.literal(1),
    engine: z.enum(['remotion', 'hyperframes', 'generated-still', 'generated-video']),
    preview: z.string(),
  }),
);
