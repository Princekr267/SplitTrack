import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { groups } from '../models/index.js';

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator privilege required.',
      },
    });
  }
  next();
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
