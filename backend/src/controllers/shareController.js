import { eq, and, or, inArray, desc, asc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { expenses, expenseSplits, payments, people } from '../models/index.js';

export async function getPublicStatement(req, res, next) {
  try {
    const person = req.person;
    const group = req.group;

    // 1. Fetch all expense splits for this person
    const splits = await db
      .select({
        id: expenseSplits.id,
        amount: expenseSplits.amount,
        expenseId: expenses.id,
        title: expenses.title,
        date: expenses.date,
        description: expenses.description,
        paidByPersonId: expenses.paidByPersonId,
      })
      .from(expenseSplits)
      .innerJoin(
        expenses,
        and(
          eq(expenseSplits.expenseId, expenses.id),
          eq(expenses.groupId, person.groupId),
          eq(expenses.isDeleted, false)
        )
      )
      .where(eq(expenseSplits.personId, person.id))
      .orderBy(asc(expenses.date));

    // Get payer names for these expenses
    const payerIds = [...new Set(splits.map((s) => s.paidByPersonId))];
    const payerMap = new Map();
    if (payerIds.length > 0) {
      const payers = await db
        .select({ id: people.id, name: people.name, isHost: people.isHost })
        .from(people)
        .where(inArray(people.id, payerIds));
      payers.forEach((p) => payerMap.set(p.id, p));
    }

    // 2. Fetch expenses paid by this person themselves
    const paidBySelf = await db
      .select({
        id: expenses.id,
        title: expenses.title,
        date: expenses.date,
        totalAmount: expenses.totalAmount,
        description: expenses.description,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, person.groupId),
          eq(expenses.paidByPersonId, person.id),
          eq(expenses.isDeleted, false)
        )
      )
      .orderBy(asc(expenses.date));

    const totalPaidForOthers = paidBySelf.reduce((sum, e) => sum + e.totalAmount, 0);

    // 3. Fetch payments involving this person
    const personPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        date: payments.date,
        mode: payments.mode,
        status: payments.status,
        description: payments.description,
        reference: payments.reference,
        rejectReason: payments.rejectReason,
        fromPersonId: payments.fromPersonId,
        toPersonId: payments.toPersonId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.groupId, person.groupId),
          eq(payments.isDeleted, false),
          or(eq(payments.fromPersonId, person.id), eq(payments.toPersonId, person.id))
        )
      )
      .orderBy(asc(payments.date));

    // 4. Calculate totals
    const totalShare = splits.reduce((sum, s) => sum + s.amount, 0);

    let acceptedSent = 0;
    let acceptedReceived = 0;
    let pendingSent = 0;

    for (const p of personPayments) {
      if (p.status === 'accepted') {
        if (p.fromPersonId === person.id) acceptedSent += p.amount;
        if (p.toPersonId === person.id) acceptedReceived += p.amount;
      } else if (p.status === 'pending') {
        if (p.fromPersonId === person.id) pendingSent += p.amount;
      }
    }

    // net = paidExpenses - shareSplits + acceptedSent - acceptedReceived
    const net = totalPaidForOthers - totalShare + acceptedSent - acceptedReceived;
    const remainingToPay = Math.max(0, -net);
    const groupOwesYou = Math.max(0, net);

    // 5. Construct chronological passbook ledger items with running balance
    const ledgerEvents = [];

    // Add expenses (as debit / debt)
    for (const s of splits) {
      ledgerEvents.push({
        type: 'expense_share',
        id: s.id,
        date: s.date,
        title: s.title,
        description: s.description,
        amount: s.amount,
        paidBy: payerMap.get(s.paidByPersonId)?.name || 'Host',
        isPaidBySelf: s.paidByPersonId === person.id,
      });
    }

    // Add payments
    for (const p of personPayments) {
      ledgerEvents.push({
        type: 'payment',
        id: p.id,
        date: p.date,
        amount: p.amount,
        mode: p.mode,
        status: p.status,
        description: p.description,
        reference: p.reference,
        rejectReason: p.rejectReason,
        isOutgoing: p.fromPersonId === person.id,
      });
    }

    // Sort chronologically
    ledgerEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute running balance for accepted entries
    let currentNet = 0;
    const ledger = ledgerEvents.map((item) => {
      if (item.type === 'expense_share') {
        currentNet -= item.amount;
      } else if (item.type === 'payment' && item.status === 'accepted') {
        if (item.isOutgoing) {
          currentNet += item.amount;
        } else {
          currentNet -= item.amount;
        }
      }

      return {
        ...item,
        runningNet: currentNet,
        runningRemaining: Math.max(0, -currentNet),
      };
    });

    res.json({
      success: true,
      data: {
        person: {
          name: person.name,
          isClaimed: !!person.linkedUserId,
        },
        group: {
          name: group.name,
          status: group.status,
        },
        totals: {
          totalShare,
          totalPaid: acceptedSent,
          pendingPayments: pendingSent,
          remainingToPay,
          groupOwesYou,
          net,
        },
        ledger,
      },
    });
  } catch (error) {
    next(error);
  }
}
