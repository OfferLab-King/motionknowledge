import {pgTable, uuid, text, integer, jsonb, timestamp} from 'drizzle-orm/pg-core';
import {projects} from './projects';
import {workspaces} from './tenancy';

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  operation: text('operation').notNull(),
  status: text('status').notNull().default('queued'),
  inputHash: text('input_hash').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  attempt: integer('attempt').notNull().default(0),
  payload: jsonb('payload').notNull().default({}),
  errorCode: text('error_code'),
  safeError: text('safe_error'),
  correlationId: text('correlation_id'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  startedAt: timestamp('started_at', {withTimezone: true}),
  completedAt: timestamp('completed_at', {withTimezone: true}),
});

export const renderJobs = pgTable('render_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('queued'),
  manifestInputHash: text('manifest_input_hash').notNull(),
  renderId: uuid('render_id'),
  errorCode: text('error_code'),
  safeError: text('safe_error'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  startedAt: timestamp('started_at', {withTimezone: true}),
  completedAt: timestamp('completed_at', {withTimezone: true}),
});

export const renders = pgTable('renders', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('rendering'),
  progress: integer('progress').notNull().default(0),
  manifestHash: text('manifest_hash'),
  mp4Key: text('mp4_key'),
  mp4Sha256: text('mp4_sha256'),
  srtKey: text('srt_key'),
  transcriptKey: text('transcript_key'),
  thumbnailKey: text('thumbnail_key'),
  chaptersKey: text('chapters_key'),
  metadataKey: text('metadata_key'),
  durationSeconds: integer('duration_seconds'),
  width: integer('width'),
  height: integer('height'),
  videoCodec: text('video_codec'),
  audioCodec: text('audio_codec'),
  fps: integer('fps'),
  providerCostUsd: text('provider_cost_usd').notNull().default('0'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  completedAt: timestamp('completed_at', {withTimezone: true}),
});

export const projectShareTokens = pgTable('project_share_tokens', {
  token: text('token').primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, {onDelete: 'cascade'}),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});
