import { eq, and, or, inArray, desc, asc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { people, groups, expenses, expenseSplits, payments } from '../models/index.js';
import { recordAuditLog } from '../services/auditService.js';
import { ensureGroupNotSettled } from '../services/groupService.js';

/**
 * GET /api/me/profiles/:personId/group-bills
 * Returns all group expenses with each split member share.
 * Requires: logged-in user, person.linkedUserId === req.user.id, can_view_all_bills = true.
 * Never returns: balances, net amounts, payments, phone numbers, hashes, user ids.
 */
export async function getGroupBillsForFriend(req, res, next) {
  try {
    const { personId } = req.params;

    // Fresh DB load — never trust JWT cache for this permission
    const [person] = await db
      .select({
        id: people.id,
        groupId: people.groupId,
        linkedUserId: people.linkedUserId,
        isHost: people.isHost,
        isDeleted: people.isDeleted,
        canViewAllBills: people.canViewAllBills,
      })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.isDeleted, false)));

    if (!person) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
    }

    // Must be the logged-in user's own profile
    if (person.linkedUserId !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your profile.' } });
    }

    // Permission check fresh from DB
    if (!person.canViewAllBills) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'The host has not granted you access to view all bills.' },
      });
    }

    // Fetch all non-deleted expenses for this group with splits
    const expenseList = await db.query.expenses.findMany({
      where: and(eq(expenses.groupId, person.groupId), eq(expenses.isDeleted, false)),
      orderBy: [asc(expenses.date), asc(expenses.createdAt)],
      columns: { id: true, title: true, date: true, description: true, totalAmount: true, splitType: true, paidByPersonId: true },
      with: {
        paidByPerson: { columns: { id: true, name: true } },
        splits: {
          columns: { personId: true, amount: true },
          with: { person: { columns: { id: true, name: true } } },
        },
      },
    });

    // Shape response: never expose balances, payments, phones, hashes, user ids
    const data = expenseList.map((exp) => ({
      id: exp.id,
      title: exp.title,
      date: exp.date,
      description: exp.description,
      totalAmount: exp.totalAmount,
      splitType: exp.splitType,
      paidByName: exp.paidByPerson?.name ?? 'Unknown',
      splits: exp.splits.map((s) => ({
        memberName: s.person?.name ?? 'Unknown',
        shareAmount: s.amount,
        isSelfShare: s.personId === exp.paidByPersonId,
        isMine: s.personId === personId,
      })),
    }));

    // Also return the group member name list (no balances, no phones, no hashes)
    const members = await db
      .select({ id: people.id, name: people.name, isHost: people.isHost })
      .from(people)
      .where(and(eq(people.groupId, person.groupId), eq(people.isDeleted, false)));

    res.json({ success: true, data: { expenses: data, members } });
  } catch (error) {
    next(error);
  }
}


/**
 * Lists all person profiles linked to the current user account across groups.
 */
export async function getLinkedProfiles(req, res, next) {
  try {
    const userId = req.user.id;

    // Fetch all non-deleted friend profiles linked to this user
    const linkedPeople = await db
      .select({
        id: people.id,
        groupId: people.groupId,
        name: people.name,
        phone: people.phone,
        note: people.note,
        canViewAllBills: people.canViewAllBills,
        createdAt: people.createdAt,
      })
      .from(people)
      .where(
        and(
          eq(people.linkedUserId, userId),
          eq(people.isHost, false),
          eq(people.isDeleted, false)
        )
      );

    if (linkedPeople.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const groupIds = [...new Set(linkedPeople.map((p) => p.groupId))];
    const groupList = await db
      .select({
        id: groups.id,
        name: groups.name,
        date: groups.date,
        status: groups.status,
      })
      .from(groups)
      .where(and(inArray(groups.id, groupIds), eq(groups.isDeleted, false)));

    const groupMap = new Map();
    groupList.forEach((g) => groupMap.set(g.id, g));

    // Calculate individual ledger totals for each linked profile
    const profileCards = [];

    for (const person of linkedPeople) {
      const group = groupMap.get(person.groupId);
      if (!group) continue;

      // Expense splits for this person
      const splits = await db
        .select({ amount: expenseSplits.amount })
        .from(expenseSplits)
        .innerJoin(
          expenses,
          and(
            eq(expenseSplits.expenseId, expenses.id),
            eq(expenses.groupId, person.groupId),
            eq(expenses.isDeleted, false)
          )
        )
        .where(eq(expenseSplits.personId, person.id));

      const shareSplitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);

      // Payments
      const userPayments = await db
        .select({
          amount: payments.amount,
          status: payments.status,
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
        );

      let acceptedSent = 0;
      let acceptedReceived = 0;
      let pendingSent = 0;

      for (const p of userPayments) {
        if (p.status === 'accepted') {
          if (p.fromPersonId === person.id) acceptedSent += p.amount;
          if (p.toPersonId === person.id) acceptedReceived += p.amount;
        } else if (p.status === 'pending') {
          if (p.fromPersonId === person.id) pendingSent += p.amount;
        }
      }

      // Net for this friend
      const net = -shareSplitsTotal + acceptedSent - acceptedReceived;
      const remainingToPay = Math.max(0, -net);
      const groupOwesYou = Math.max(0, net);

      profileCards.push({
        person,
        group,
        summary: {
          shareSplitsTotal,
          acceptedSentTotal: acceptedSent,
          pendingSentTotal: pendingSent,
          net,
          remainingToPay,
          groupOwesYou,
        },
      });
    }

    res.json({
      success: true,
      data: profileCards,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logged-in friend submits a repayment to the host. Created with status = 'pending'.
 */
export async function submitFriendPayment(req, res, next) {
  try {
    const person = req.person;
    const { amount, date, mode, description, reference } = req.body;

    await ensureGroupNotSettled(person.groupId);

    // Find the host person of this group
    const [hostPerson] = await db
      .select({ id: people.id })
      .from(people)
      .where(
        and(
          eq(people.groupId, person.groupId),
          eq(people.isHost, true),
          eq(people.isDeleted, false)
        )
      );

    if (!hostPerson) {
      return res.status(404).json({
        success: false,
        error: { code: 'HOST_NOT_FOUND', message: 'Group host not found.' },
      });
    }

    const [payment] = await db
      .insert(payments)
      .values({
        groupId: person.groupId,
        fromPersonId: person.id,
        toPersonId: hostPerson.id,
        amount,
        date: date ? new Date(date) : new Date(),
        mode,
        description: description || '',
        reference: reference || '',
        status: 'pending', // Pending host decision
        createdByType: 'friend',
        createdBy: req.user.id,
        decidedBy: null,
        decidedAt: null,
      })
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'SUBMIT_PAYMENT',
      entityType: 'Payment',
      entityId: payment.id,
      groupId: person.groupId,
      after: payment,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Payment submitted to host for approval.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Friend resubmits a rejected payment after editing details.
 */
export async function resubmitFriendPayment(req, res, next) {
  try {
    const person = req.person;
    const { paymentId } = req.params;
    const { amount, mode, description, reference, date } = req.body;

    await ensureGroupNotSettled(person.groupId);

    const [existing] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.fromPersonId, person.id),
          eq(payments.groupId, person.groupId),
          eq(payments.isDeleted, false)
        )
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' },
      });
    }

    if (existing.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_RESUBMIT',
          message: 'Only rejected payments can be resubmitted.',
        },
      });
    }

    const updateFields = {
      status: 'pending',
      rejectReason: '',
      decidedBy: null,
      decidedAt: null,
    };

    if (amount !== undefined) updateFields.amount = amount;
    if (mode !== undefined) updateFields.mode = mode;
    if (description !== undefined) updateFields.description = description;
    if (reference !== undefined) updateFields.reference = reference;
    if (date !== undefined) updateFields.date = new Date(date);

    const [updated] = await db
      .update(payments)
      .set(updateFields)
      .where(eq(payments.id, paymentId))
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'RESUBMIT_PAYMENT',
      entityType: 'Payment',
      entityId: paymentId,
      groupId: person.groupId,
      before: existing,
      after: updated,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Payment resubmitted to host as pending.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
