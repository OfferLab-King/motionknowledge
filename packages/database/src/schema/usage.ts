import {pgTable, uuid, text, integer, timestamp} from 'drizzle-orm/pg-core';
import {projects} from './projects';
import {workspaces} from './tenancy';

export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  projectId: uuid('project_id').references(() => projects.id, {onDelete: 'cascade'}),
  userId: uuid('user_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  operation: text('operation').notNull(),
  inputUnits: text('input_units').notNull().default('0'),
  outputUnits: text('output_units').notNull().default('0'),
  providerCostUsd: text('provider_cost_usd').notNull().default('0'),
  computeDurationMs: integer('compute_duration_ms').notNull().default(0),
  jobId: uuid('job_id'),
  correlationId: text('correlation_id'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  workspaceId: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  status: text('status').notNull().default('free'),
  plan: text('plan').notNull().default('free'),
  startedAt: timestamp('started_at', {withTimezone: true}).notNull().defaultNow(),
  endedAt: timestamp('ended_at', {withTimezone: true}),
});

export const creditLedger = pgTable('credit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {onDelete: 'cascade'}),
  entryType: text('entry_type').notNull(),
  amountCredits: integer('amount_credits').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});
