import {pgTable, uuid, text, timestamp, primaryKey} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const workspaceMemberships = pgTable(
  'workspace_memberships',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, {onDelete: 'cascade'}),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull().default('owner'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [primaryKey({columns: [table.workspaceId, table.userId]})],
);
