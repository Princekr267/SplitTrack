import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { groups } from './groups.js';
import { people } from './people.js';
import { expenses, expenseSplits } from './expenses.js';
import { payments } from './payments.js';
import { auditLogs } from './auditLogs.js';

export const usersRelations = relations(users, ({ many }) => ({
  createdGroups: many(groups),
  linkedPeople: many(people),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
  people: many(people),
  expenses: many(expenses),
  payments: many(payments),
  auditLogs: many(auditLogs),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  group: one(groups, { fields: [people.groupId], references: [groups.id] }),
  linkedUser: one(users, { fields: [people.linkedUserId], references: [users.id] }),
  expenseSplits: many(expenseSplits),
  paidExpenses: many(expenses),
  sentPayments: many(payments, { relationName: 'payer' }),
  receivedPayments: many(payments, { relationName: 'receiver' }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  paidByPerson: one(people, { fields: [expenses.paidByPersonId], references: [people.id] }),
  creator: one(users, { fields: [expenses.createdBy], references: [users.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  person: one(people, { fields: [expenseSplits.personId], references: [people.id] }),
  group: one(groups, { fields: [expenseSplits.groupId], references: [groups.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  group: one(groups, { fields: [payments.groupId], references: [groups.id] }),
  fromPerson: one(people, { fields: [payments.fromPersonId], references: [people.id], relationName: 'payer' }),
  toPerson: one(people, { fields: [payments.toPersonId], references: [people.id], relationName: 'receiver' }),
  decidedByUser: one(users, { fields: [payments.decidedBy], references: [users.id] }),
  creator: one(users, { fields: [payments.createdBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
  group: one(groups, { fields: [auditLogs.groupId], references: [groups.id] }),
}));
