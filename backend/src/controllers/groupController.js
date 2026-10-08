import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { groups, people, expenses, payments } from '../models/index.js';
import { createGroupWithHost, settleGroup, reopenGroup, ensureGroupNotSettled } from '../services/groupService.js';
import { calculateGroupBalances } from '../services/balanceService.js';
import { recordAuditLog } from '../services/auditService.js';

export async function createGroup(req, res, next) {
  try {
    const { name, date, description } = req.body;
    const result = await createGroupWithHost({
      name,
      date,
      description,
      user: req.user,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroups(req, res, next) {
  try {
    const userId = req.user.id;

    // Groups where user is creator (host)
    const hostedGroups = await db
      .select()
      .from(groups)
      .where(and(eq(groups.createdBy, userId), eq(groups.isDeleted, false)))
      .orderBy(desc(groups.createdAt));

    // Groups where user is linked friend
    const friendProfiles = await db
      .select({ groupId: people.groupId })
      .from(people)
      .where(and(eq(people.linkedUserId, userId), eq(people.isDeleted, false), eq(people.isHost, false)));

    const friendGroupIds = friendProfiles.map((p) => p.groupId);

    let memberGroups = [];
    if (friendGroupIds.length > 0) {
      memberGroups = await db
        .select()
        .from(groups)
        .where(and(inArray(groups.id, friendGroupIds), eq(groups.isDeleted, false)))
        .orderBy(desc(groups.createdAt));
    }

    res.json({
      success: true,
      data: {
        hosted: hostedGroups,
        member: memberGroups,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupById(req, res, next) {
  try {
    const { groupId } = req.params;

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)));

    if (!group) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' },
      });
    }

    // Permission check: host, admin, or linked friend
    const isHost = group.createdBy === req.user.id;
    const isAdmin = req.user.role === 'admin';

    let isMember = false;
    if (!isHost && !isAdmin) {
      const [linkedPerson] = await db
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.groupId, groupId),
            eq(people.linkedUserId, req.user.id),
            eq(people.isDeleted, false)
          )
        );
      isMember = !!linkedPerson;
    }

    if (!isHost && !isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this group.' },
      });
    }

    // Balances and people
    const balanceData = await calculateGroupBalances(groupId);

    res.json({
      success: true,
      data: {
        group,
        isHost: isHost || isAdmin,
        ...balanceData,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const { name, date, description } = req.body;

    await ensureGroupNotSettled(groupId);

    const [existing] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (date !== undefined) updateFields.date = new Date(date);
    if (description !== undefined) updateFields.description = description;

    const [updated] = await db
      .update(groups)
      .set(updateFields)
      .where(eq(groups.id, groupId))
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_GROUP',
      entityType: 'Group',
      entityId: groupId,
      groupId,
      before: existing,
      after: updated,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const { groupId } = req.params;

    const [existing] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!existing || existing.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' },
      });
    }

    const [deleted] = await db
      .update(groups)
      .set({ isDeleted: true })
      .where(eq(groups.id, groupId))
      .returning();

    await recordAuditLog({
      actor: req.user,
      action: 'DELETE_GROUP',
      entityType: 'Group',
      entityId: groupId,
      groupId,
      before: existing,
      after: deleted,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Group deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function handleSettleGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const settled = await settleGroup({
      groupId,
      user: req.user,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: settled,
      message: 'Group settled successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function handleReopenGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const reopened = await reopenGroup({
      groupId,
      user: req.user,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: reopened,
      message: 'Group reopened successfully.',
    });
  } catch (error) {
    next(error);
  }
}
