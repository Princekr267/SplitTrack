import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { payments, people } from '../models/index.js';
import { ensureGroupNotSettled } from '../services/groupService.js';
import { recordAuditLog } from '../services/auditService.js';

export async function createHostPayment(req, res, next) {
  try {
    const { groupId } = req.params;
    const {
      fromPersonId,
      toPersonId,
      amount,
      date,
      mode,
      description,
      reference,
    } = req.body;

    await ensureGroupNotSettled(groupId);

    if (fromPersonId === toPersonId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_TARGET',
          message: 'Sender and receiver must be different members.',
        },
      });
    }

    // Verify both belong to group
    const [fromPerson] = await db
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(
        and(
          eq(people.id, fromPersonId),
          eq(people.groupId, groupId),
          eq(people.isDeleted, false)
        )
      );

    const [toPerson] = await db
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(
        and(
          eq(people.id, toPersonId),
          eq(people.groupId, groupId),
          eq(people.isDeleted, false)
        )
      );

    if (!fromPerson || !toPerson) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MEMBERS',
          message: 'Both sender and receiver must be active group members.',
        },
      });
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          groupId,
          fromPersonId,
          toPersonId,
          amount,
          date: date ? new Date(date) : new Date(),
          mode,
          description: description || '',
          reference: reference || '',
          status: 'accepted', // Auto-accepted when recorded by host
          createdByType: 'host',
          createdBy: req.user.id,
          decidedBy: req.user.id,
          decidedAt: new Date(),
        })
        .returning();

      await recordAuditLog(
        {
          actor: req.user,
          action: 'RECORD_PAYMENT',
          entityType: 'Payment',
          entityId: payment.id,
          groupId,
          after: payment,
          ipAddress: req.ip,
        },
        tx
      );

      return payment;
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayments(req, res, next) {
  try {
    const { groupId } = req.params;

    const paymentList = await db.query.payments.findMany({
      where: and(eq(payments.groupId, groupId), eq(payments.isDeleted, false)),
      orderBy: [desc(payments.date), desc(payments.createdAt)],
      with: {
        fromPerson: {
          columns: { id: true, name: true, isHost: true },
        },
        toPerson: {
          columns: { id: true, name: true, isHost: true },
        },
      },
    });

    res.json({
      success: true,
      data: paymentList,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Host gets all pending payments for a group.
 */
export async function getPendingPayments(req, res, next) {
  try {
    const { groupId } = req.params;

    const list = await db.query.payments.findMany({
      where: and(
        eq(payments.groupId, groupId),
        eq(payments.status, 'pending'),
        eq(payments.isDeleted, false)
      ),
      orderBy: [desc(payments.createdAt)],
      with: {
        fromPerson: { columns: { id: true, name: true, isHost: true } },
        toPerson: { columns: { id: true, name: true, isHost: true } },
      },
    });

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Host accepts a pending payment submission.
 */
export async function acceptPayment(req, res, next) {
  try {
    const { groupId, paymentId } = req.params;

    await ensureGroupNotSettled(groupId);

    const [existing] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.groupId, groupId),
          eq(payments.isDeleted, false)
        )
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' },
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_PENDING',
          message: `Cannot accept a payment that is already ${existing.status}.`,
        },
      });
    }

    const [updated] = await db
      .update(payments)
      .set({
        status: 'accepted',
        decidedBy: req.user.id,
        decidedAt: new Date(),
        rejectReason: '',
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'ACCEPT_PAYMENT',
      entityType: 'Payment',
      entityId: paymentId,
      groupId,
      before: existing,
      after: updated,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Payment accepted and applied to balances! 🤝',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Host rejects a pending payment with a required reason.
 */
export async function rejectPayment(req, res, next) {
  try {
    const { groupId, paymentId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REJECTION_REASON_REQUIRED',
          message: 'A rejection reason is required so the friend knows why.',
        },
      });
    }

    await ensureGroupNotSettled(groupId);

    const [existing] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.groupId, groupId),
          eq(payments.isDeleted, false)
        )
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' },
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_PENDING',
          message: `Cannot reject a payment that is already ${existing.status}.`,
        },
      });
    }

    const [updated] = await db
      .update(payments)
      .set({
        status: 'rejected',
        rejectReason: reason.trim(),
        decidedBy: req.user.id,
        decidedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'REJECT_PAYMENT',
      entityType: 'Payment',
      entityId: paymentId,
      groupId,
      before: existing,
      after: updated,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Payment rejected. Friend can edit and resubmit.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
