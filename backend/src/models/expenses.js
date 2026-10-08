import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
  foreignKey,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { groups } from './groups.js';
import { users } from './users.js';
import { people } from './people.js';

export const splitTypeEnum = pgEnum('split_type', ['equal', 'exact', 'percentage']);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'restrict' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    totalAmount: integer('total_amount').notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
    paidByPersonId: uuid('paid_by_person_id').notNull(),
    description: text('description').default('').notNull(),
    splitType: splitTypeEnum('split_type').default('equal').notNull(),
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
    unique('expenses_id_group_id_unique').on(table.id, table.groupId),
    foreignKey({
      columns: [table.paidByPersonId, table.groupId],
      foreignColumns: [people.id, people.groupId],
      name: 'expenses_paid_by_person_group_fk',
    }).onDelete('restrict'),
    check('expenses_total_amount_positive', sql`${table.totalAmount} > 0`),
    index('expenses_group_id_idx').on(table.groupId),
    index('expenses_date_idx').on(table.date),
  ]
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    expenseId: uuid('expense_id').notNull(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'restrict' })
      .notNull(),
    personId: uuid('person_id').notNull(),
    amount: integer('amount').notNull(),
    basisPoints: integer('basis_points'),
    exactAmount: integer('exact_amount'),
  },
  (table) => [
    unique('expense_splits_expense_person_unique').on(table.expenseId, table.personId),
    foreignKey({
      columns: [table.expenseId, table.groupId],
      foreignColumns: [expenses.id, expenses.groupId],
      name: 'expense_splits_expense_group_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.personId, table.groupId],
      foreignColumns: [people.id, people.groupId],
      name: 'expense_splits_person_group_fk',
    }).onDelete('restrict'),
    check('expense_splits_amount_non_negative', sql`${table.amount} >= 0`),
    index('expense_splits_expense_id_idx').on(table.expenseId),
    index('expense_splits_person_id_idx').on(table.personId),
    index('expense_splits_group_id_idx').on(table.groupId),
  ]
);
