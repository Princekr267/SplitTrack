import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const resetRequests = pgTable(
  'reset_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    note: text('note'),
    status: varchar('status', { length: 20 }).default('open').notNull(),
    handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'restrict' }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reset_requests_user_id_idx').on(table.userId),
    index('reset_requests_status_idx').on(table.status),
  ]
);
