import { pgTable, uuid, varchar, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    failedAttempts: integer('failed_attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdByAdminId: uuid('created_by_admin_id').references(() => users.id, { onDelete: 'restrict' }),
    requestId: uuid('request_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('password_resets_token_hash_idx').on(table.tokenHash),
    index('password_resets_user_id_idx').on(table.userId),
  ]
);
