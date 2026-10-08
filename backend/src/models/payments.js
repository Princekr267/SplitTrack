import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  foreignKey,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { groups } from './groups.js';
import { users } from './users.js';
import { people } from './people.js';

export const paymentModeEnum = pgEnum('payment_mode', ['cash', 'online']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'accepted', 'rejected']);
export const createdByTypeEnum = pgEnum('created_by_type', ['host', 'friend']);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'restrict' })
      .notNull(),
    fromPersonId: uuid('from_person_id').notNull(),
    toPersonId: uuid('to_person_id').notNull(),
    amount: integer('amount').notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
    mode: paymentModeEnum('mode').notNull(),
    description: text('description').default('').notNull(),
    reference: varchar('reference', { length: 255 }).default('').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    rejectReason: text('reject_reason').default('').notNull(),
    decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'restrict' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdByType: createdByTypeEnum('created_by_type').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'restrict' }),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.fromPersonId, table.groupId],
      foreignColumns: [people.id, people.groupId],
      name: 'payments_from_person_group_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.toPersonId, table.groupId],
      foreignColumns: [people.id, people.groupId],
      name: 'payments_to_person_group_fk',
    }).onDelete('restrict'),
    check('payments_amount_positive', sql`${table.amount} > 0`),
    check('payments_from_ne_to', sql`${table.fromPersonId} <> ${table.toPersonId}`),
    check(
      'payments_friend_decision_check',
      sql`(${table.createdByType} <> 'friend' OR ${table.status} <> 'accepted' OR ${table.decidedBy} IS NOT NULL)`
    ),
    index('payments_group_id_idx').on(table.groupId),
    index('payments_from_person_idx').on(table.fromPersonId),
    index('payments_to_person_idx').on(table.toPersonId),
    index('payments_status_idx').on(table.status),
  ]
);
