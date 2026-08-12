import {pgTable, uuid, text, integer, boolean, jsonb, timestamp} from 'drizzle-orm/pg-core';
import {projects, scenes, sources} from './projects';
import {workspaces} from './tenancy';

const artifactColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  schemaVersion: integer('schema_version').notNull().default(1),
  payload: jsonb('payload').notNull(),
  inputHash: text('input_hash').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
} as const;

export const lessonPlanVersions = pgTable('lesson_plan_versions', {
  ...artifactColumns,
  provider: text('provider').notNull(),
  costUsd: text('cost_usd').notNull().default('0'),
});

export const scriptVersions = pgTable('script_versions', {
  ...artifactColumns,
  provider: text('provider').notNull(),
  costUsd: text('cost_usd').notNull().default('0'),
});

export const storyboardVersions = pgTable('storyboard_versions', {
  ...artifactColumns,
  provider: text('provider').notNull(),
  costUsd: text('cost_usd').notNull().default('0'),
});

export const captionVersions = pgTable('caption_versions', artifactColumns);

export const ttsManifestVersions = pgTable('tts_manifest_versions', artifactColumns);

export const qaVersions = pgTable('qa_versions', artifactColumns);

export const renderManifestVersions = pgTable('render_manifest_versions', artifactColumns);

export const youtubeMetadataVersions = pgTable('youtube_metadata_versions', artifactColumns);

export const researchDocuments = pgTable('research_documents', {
  ...artifactColumns,
  provider: text('provider').notNull(),
});

export const claims = pgTable('claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  researchDocumentId: uuid('research_document_id'),
  claimId: text('claim_id').notNull(),
  text: text('text').notNull(),
  confidence: text('confidence').notNull().default('medium'),
  category: text('category').notNull().default('fact'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const claimSourceLinks = pgTable(
  'claim_source_links',
  {
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, {onDelete: 'cascade'}),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, {onDelete: 'cascade'}),
  },
  (table) => [{pk: {columns: [table.claimId, table.sourceId], name: 'claim_source_links_pkey'}}],
);

export const sceneVersions = pgTable('scene_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id')
    .notNull()
    .references(() => scenes.id, {onDelete: 'cascade'}),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  schemaVersion: integer('schema_version').notNull().default(1),
  payload: jsonb('payload').notNull(),
  inputHash: text('input_hash').notNull(),
  provider: text('provider').notNull(),
  costUsd: text('cost_usd').notNull().default('0'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});
