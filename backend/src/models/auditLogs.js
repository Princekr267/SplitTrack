import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { groups } from './groups.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    actorRole: varchar('actor_role', { length: 50 }).default('anonymous').notNull(),
    actorName: varchar('actor_name', { length: 255 }).default('System').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    groupId: uuid('group_id').references(() => groups.id, { onDelete: 'restrict' }),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: varchar('ip_address', { length: 100 }).default('').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_group_id_idx').on(table.groupId),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_action_idx').on(table.action),
  ]
);
