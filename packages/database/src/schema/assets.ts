import {pgTable, uuid, text, integer, timestamp, primaryKey, jsonb} from 'drizzle-orm/pg-core';
import {projects, scenes} from './projects';
import {sceneVersions} from './artifacts';
import {workspaces} from './tenancy';

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  key: text('key').notNull(),
  sha256: text('sha256').notNull(),
  contentType: text('content_type').notNull(),
  byteCount: integer('byte_count').notNull().default(0),
  origin: text('origin').notNull(),
  sourceUrl: text('source_url'),
  license: text('license').notNull(),
  attribution: text('attribution'),
  prompt: text('prompt'),
  estimatedCostUsd: text('estimated_cost_usd').notNull().default('0'),
  provider: text('provider').notNull().default('local'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const assetLinks = pgTable(
  'asset_links',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, {onDelete: 'cascade'}),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {onDelete: 'cascade'}),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, {onDelete: 'cascade'}),
    sceneId: uuid('scene_id').references(() => scenes.id, {onDelete: 'cascade'}),
    purpose: text('purpose').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [primaryKey({columns: [table.assetId, table.purpose]})],
);

export const audioAssets = pgTable('audio_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  sceneId: uuid('scene_id').references(() => scenes.id, {onDelete: 'cascade'}),
  sceneVersionId: uuid('scene_version_id').references(() => sceneVersions.id, {
    onDelete: 'cascade',
  }),
  assetKey: text('asset_key').notNull(),
  sha256: text('sha256').notNull(),
  durationMs: integer('duration_ms').notNull(),
  sampleRateHz: integer('sample_rate_hz').notNull().default(24000),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  wordTimings: jsonb('word_timings').notNull().default([]),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});
