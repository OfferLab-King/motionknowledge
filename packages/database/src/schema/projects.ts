import {pgTable, uuid, text, integer, timestamp} from 'drizzle-orm/pg-core';
import {workspaces} from './tenancy';
import {sql} from 'drizzle-orm';

export const projectStatus = sql<string>`check (status in (
  'DRAFT', 'RESEARCHING', 'OUTLINE_READY', 'SCRIPT_READY', 'STORYBOARD_READY',
  'GENERATING', 'PREVIEW_READY', 'QA_FAILED', 'READY_FOR_REVIEW', 'APPROVED',
  'RENDERING', 'COMPLETE'
))`;

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  title: text('title').notNull(),
  audienceLevel: text('audience_level').notNull().default('beginner'),
  targetDurationSeconds: integer('target_duration_seconds').notNull().default(300),
  language: text('language').notNull().default('en'),
  tone: text('tone').notNull().default('professional'),
  voice: text('voice').notNull().default('Samantha'),
  style: text('style').notNull().default('professional'),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),
  status: text('status').notNull().default('DRAFT'),
  latestPreviewRenderId: uuid('latest_preview_render_id'),
  latestRenderResultId: uuid('latest_render_result_id'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  version: integer('version').notNull().default(1),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  rawSha256: text('raw_sha256').notNull(),
  normalizedSha256: text('normalized_sha256').notNull(),
  originalUrl: text('original_url'),
  fetchedAt: timestamp('fetched_at', {withTimezone: true}),
  language: text('language').notNull().default('en'),
  byteCount: integer('byte_count').notNull().default(0),
  status: text('status').notNull().default('PENDING'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  sceneKey: text('scene_key').notNull(),
  index: integer('index').notNull().default(0),
  title: text('title').notNull(),
  status: text('status').notNull().default('PENDING'),
  activeSceneVersionId: uuid('active_scene_version_id'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});
