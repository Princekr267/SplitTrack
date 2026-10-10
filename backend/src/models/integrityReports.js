import { pgTable, uuid, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const integrityReports = pgTable('integrity_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 20 }).notNull(), // 'clean' | 'corrupted'
  issues: jsonb('issues').default([]).notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  durationMs: integer('duration_ms').notNull(),
  runBy: uuid('run_by').references(() => users.id, { onDelete: 'set null' }),
});
