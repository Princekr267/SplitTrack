import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { groups, users } from '../models/index.js';

export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    const [freshUser] = await db
      .select({
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!freshUser || !freshUser.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled.',
        },
      });
    }

    if (freshUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Administrator privilege required.',
        },
      });
    }

    req.user.role = freshUser.role;
    req.user.isActive = freshUser.isActive;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireGroupHost(req, res, next) {
  const groupId = req.params.groupId || req.body.groupId;
  if (!groupId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_GROUP_ID',
        message: 'Group ID is required.',
      },
    });
  }

  try {
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)));

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found.',
        },
      });
    }

    const isHost = group.createdBy === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the host of this group can perform this action.',
        },
      });
    }

    req.group = group;
    next();
  } catch (error) {
    next(error);
  }
}
