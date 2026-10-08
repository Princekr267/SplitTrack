import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { people, expenses, expenseSplits, payments } from '../models/index.js';

/**
 * Computes group balances and per-person ledger stats.
 * All math is conducted strictly in integer paise.
 * 
 * Formula for each person P:
 * net = (total of expenses they paid) 
 *     - (total of their splits) 
 *     + (accepted payments they SENT) 
 *     - (accepted payments they RECEIVED)
 * 
 * Invariants:
 * sum(all nets in group) === 0
 * 
 * @param {string} groupId - Group UUID
 * @param {object} [tx=db] - Optional Drizzle transaction handle
 */
export async function calculateGroupBalances(groupId, tx = db) {
  // 1. Fetch all non-deleted members in the group
  const groupPeople = await tx
    .select({
      id: people.id,
      name: people.name,
      isHost: people.isHost,
      linkedUserId: people.linkedUserId,
      shareEnabled: people.shareEnabled,
      hasShareLink: sql`CASE WHEN ${people.shareTokenHash} IS NOT NULL THEN true ELSE false END`.mapWith(Boolean),
      hasInvite: sql`CASE WHEN ${people.inviteCodeHash} IS NOT NULL THEN true ELSE false END`.mapWith(Boolean),
      inviteExpiresAt: people.inviteExpiresAt,
      isDeleted: people.isDeleted,
    })
    .from(people)
    .where(and(eq(people.groupId, groupId), eq(people.isDeleted, false)));

  const personMap = new Map();
  for (const p of groupPeople) {
    personMap.set(p.id, {
      ...p,
      paidExpensesTotal: 0,
      shareSplitsTotal: 0,
      acceptedSentPaymentsTotal: 0,
      acceptedReceivedPaymentsTotal: 0,
      pendingSentPaymentsTotal: 0,
      pendingReceivedPaymentsTotal: 0,
      rejectedPaymentsTotal: 0,
      net: 0,
      remainingToPay: 0,
      groupOwesYou: 0,
    });
  }

  // 2. Aggregate expenses paid by each person
  const paidExpensesAgg = await tx
    .select({
      personId: expenses.paidByPersonId,
      totalPaid: sql`COALESCE(SUM(${expenses.totalAmount}), 0)::text`.mapWith(Number),
    })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)))
    .groupBy(expenses.paidByPersonId);

  for (const row of paidExpensesAgg) {
    if (personMap.has(row.personId)) {
      personMap.get(row.personId).paidExpensesTotal = row.totalPaid;
    }
  }

  // 3. Aggregate expense splits per person
  // (Filter only non-deleted parent expenses)
  const splitsAgg = await tx
    .select({
      personId: expenseSplits.personId,
      totalShare: sql`COALESCE(SUM(${expenseSplits.amount}), 0)::text`.mapWith(Number),
    })
    .from(expenseSplits)
    .innerJoin(
      expenses,
      and(
        eq(expenseSplits.expenseId, expenses.id),
        eq(expenses.groupId, groupId),
        eq(expenses.isDeleted, false)
      )
    )
    .groupBy(expenseSplits.personId);

  for (const row of splitsAgg) {
    if (personMap.has(row.personId)) {
      personMap.get(row.personId).shareSplitsTotal = row.totalShare;
    }
  }

  // 4. Aggregate payments by status and direction
  const paymentsAgg = await tx
    .select({
      fromPersonId: payments.fromPersonId,
      toPersonId: payments.toPersonId,
      status: payments.status,
      total: sql`COALESCE(SUM(${payments.amount}), 0)::text`.mapWith(Number),
    })
    .from(payments)
    .where(and(eq(payments.groupId, groupId), eq(payments.isDeleted, false)))
    .groupBy(payments.fromPersonId, payments.toPersonId, payments.status);

  for (const row of paymentsAgg) {
    const fromP = personMap.get(row.fromPersonId);
    const toP = personMap.get(row.toPersonId);

    if (row.status === 'accepted') {
      if (fromP) fromP.acceptedSentPaymentsTotal += row.total;
      if (toP) toP.acceptedReceivedPaymentsTotal += row.total;
    } else if (row.status === 'pending') {
      if (fromP) fromP.pendingSentPaymentsTotal += row.total;
      if (toP) toP.pendingReceivedPaymentsTotal += row.total;
    } else if (row.status === 'rejected') {
      if (fromP) fromP.rejectedPaymentsTotal += row.total;
    }
  }

  // 5. Compute net and UI metrics for each person
  let totalSpent = 0;
  let totalAcceptedPayments = 0;
  let totalPendingPayments = 0;
  let netSumCheck = 0;

  for (const person of personMap.values()) {
    // net = paidExpenses - shareSplits + acceptedSent - acceptedReceived
    const net =
      person.paidExpensesTotal -
      person.shareSplitsTotal +
      person.acceptedSentPaymentsTotal -
      person.acceptedReceivedPaymentsTotal;

    person.net = net;
    person.remainingToPay = Math.max(0, -net);
    person.groupOwesYou = Math.max(0, net);

    netSumCheck += net;
    totalSpent += person.paidExpensesTotal;
    totalAcceptedPayments += person.acceptedSentPaymentsTotal;
    totalPendingPayments += person.pendingSentPaymentsTotal;
  }

  // Total spent across group is total of all expenses (counted once)
  // Each expense is paid by one person, so sum of all paidExpensesTotal === totalSpent.
  const isSettledReady = [...personMap.values()].every((p) => p.net === 0);

  return {
    people: Array.from(personMap.values()),
    summary: {
      totalSpent,
      totalReceived: totalAcceptedPayments,
      totalPending: totalPendingPayments,
      isSettledReady,
      netSumCheck, // Must be 0
    },
  };
}
