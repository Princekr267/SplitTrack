import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const authRateLimits = pgTable('auth_rate_limits', {
  key: varchar('key', { length: 255 }).primaryKey(),
  count: integer('count').default(1).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
});
