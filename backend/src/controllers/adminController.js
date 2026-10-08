import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users, groups, expenses, payments, auditLogs, people } from '../models/index.js';
import { recordAuditLog } from '../services/auditService.js';

/**
 * High-level system health & volume statistics.
 */
export async function getSystemStats(req, res, next) {
  try {
    const [userCount] = await db
      .select({
        total: sql`count(*)::int`,
        active: sql`count(*) filter (where ${users.isActive} = true)::int`,
      })
      .from(users);

    const [groupCount] = await db
      .select({
        total: sql`count(*)::int`,
        active: sql`count(*) filter (where ${groups.status} = 'active')::int`,
        settled: sql`count(*) filter (where ${groups.status} = 'settled')::int`,
      })
      .from(groups)
      .where(eq(groups.isDeleted, false));

    const [expenseStats] = await db
      .select({
        totalCount: sql`count(*)::int`,
        totalVolume: sql`coalesce(sum(${expenses.totalAmount}), 0)::bigint`,
      })
      .from(expenses)
      .where(eq(expenses.isDeleted, false));

    const [paymentStats] = await db
      .select({
        totalCount: sql`count(*)::int`,
        acceptedVolume: sql`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'accepted'), 0)::bigint`,
        pendingCount: sql`count(*) filter (where ${payments.status} = 'pending')::int`,
        pendingVolume: sql`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)::bigint`,
      })
      .from(payments)
      .where(eq(payments.isDeleted, false));

    const [auditLogCount] = await db
      .select({ total: sql`count(*)::int` })
      .from(auditLogs);

    // Recent 5 system actions
    const recentActivity = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    res.json({
      success: true,
      data: {
        users: {
          total: userCount?.total || 0,
          active: userCount?.active || 0,
        },
        groups: {
          total: groupCount?.total || 0,
          active: groupCount?.active || 0,
          settled: groupCount?.settled || 0,
        },
        expenses: {
          count: expenseStats?.totalCount || 0,
          volume: Number(expenseStats?.totalVolume || 0),
        },
        payments: {
          count: paymentStats?.totalCount || 0,
          acceptedVolume: Number(paymentStats?.acceptedVolume || 0),
          pendingCount: paymentStats?.pendingCount || 0,
          pendingVolume: Number(paymentStats?.pendingVolume || 0),
        },
        auditLogsTotal: auditLogCount?.total || 0,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all users with search, role filter, and pagination.
 */
export async function getUsers(req, res, next) {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const pageSize = Math.min(100, parseInt(limit, 10));

    let conditions = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(users.name, term), ilike(users.email, term)));
    }

    if (role && (role === 'admin' || role === 'user')) {
      conditions.push(eq(users.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(users)
      .where(whereClause);

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      success: true,
      data: {
        users: userList,
        pagination: {
          total: countResult?.count || 0,
          page: parseInt(page, 10),
          limit: pageSize,
          totalPages: Math.ceil((countResult?.count || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Activate or deactivate a user account.
 */
export async function toggleUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_SELF_DEACTIVATE',
          message: 'Administrators cannot deactivate their own account.',
        },
      });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: Boolean(isActive) })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });

    await recordAuditLog({
      actor: req.user,
      action: 'TOGGLE_USER_STATUS',
      entityType: 'User',
      entityId: userId,
      before: { isActive: targetUser.isActive },
      after: { isActive: updated.isActive },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `User account has been ${updated.isActive ? 'activated' : 'deactivated'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all groups platform-wide for admin inspection.
 */
export async function getAdminGroups(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const pageSize = Math.min(100, parseInt(limit, 10));

    let conditions = [eq(groups.isDeleted, false)];
    if (status && (status === 'active' || status === 'settled')) {
      conditions.push(eq(groups.status, status));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(groups)
      .where(whereClause);

    const groupList = await db.query.groups.findMany({
      where: whereClause,
      orderBy: [desc(groups.createdAt)],
      limit: pageSize,
      offset: offset,
      with: {
        creator: { columns: { id: true, name: true, email: true } },
        people: {
          columns: { id: true, name: true, isHost: true },
          where: eq(people.isDeleted, false),
        },
      },
    });

    res.json({
      success: true,
      data: {
        groups: groupList,
        pagination: {
          total: countResult?.count || 0,
          page: parseInt(page, 10),
          limit: pageSize,
          totalPages: Math.ceil((countResult?.count || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Query immutable audit logs with flexible filtering and pagination.
 */
export async function getAuditLogs(req, res, next) {
  try {
    const { action, entityType, actorUserId, groupId, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const pageSize = Math.min(100, parseInt(limit, 10));

    let conditions = [];

    if (action && action.trim()) {
      conditions.push(eq(auditLogs.action, action.trim()));
    }
    if (entityType && entityType.trim()) {
      conditions.push(eq(auditLogs.entityType, entityType.trim()));
    }
    if (actorUserId && actorUserId.trim()) {
      conditions.push(eq(auditLogs.actorUserId, actorUserId.trim()));
    }
    if (groupId && groupId.trim()) {
      conditions.push(eq(auditLogs.groupId, groupId.trim()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: countResult?.count || 0,
          page: parseInt(page, 10),
          limit: pageSize,
          totalPages: Math.ceil((countResult?.count || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
