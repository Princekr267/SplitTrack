import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const groupStatusEnum = pgEnum('group_status', ['active', 'settled']);

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
    description: text('description').default('').notNull(),
    status: groupStatusEnum('status').default('active').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('groups_created_by_idx').on(table.createdBy),
    index('groups_status_idx').on(table.status),
  ]
);
