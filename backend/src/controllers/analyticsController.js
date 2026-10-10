import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { groups, people, users } from '../models/index.js';
import {
  getGroupAnalytics as calculateGroupAnalytics,
  getPersonAnalytics as calculatePersonAnalytics,
  getAdminAnalytics as calculateAdminAnalytics,
} from '../services/analyticsService.js';

/**
 * GET /api/groups/:groupId/analytics?tz=
 * Accessible by host of group or admin.
 */
export async function getGroupAnalytics(req, res, next) {
  try {
    const { groupId } = req.params;
    const tz = req.query.tz || 'Asia/Kolkata';

    const [group] = await db
      .select({ id: groups.id, createdBy: groups.createdBy, isDeleted: groups.isDeleted })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)));

    if (!group) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' },
      });
    }

    const isHost = group.createdBy === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view group analytics.' },
      });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    const data = await calculateGroupAnalytics(groupId, tz);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/me/profiles/:personId/analytics?tz=
 * Accessible only by friend with linkedUserId === req.user.id.
 */
export async function getFriendAnalytics(req, res, next) {
  try {
    const { personId } = req.params;
    const tz = req.query.tz || 'Asia/Kolkata';

    const [person] = await db
      .select({
        id: people.id,
        groupId: people.groupId,
        linkedUserId: people.linkedUserId,
        isHost: people.isHost,
        isDeleted: people.isDeleted,
      })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.isDeleted, false)));

    if (!person) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' },
      });
    }

    if (person.linkedUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this profile analytics.' },
      });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    const data = await calculatePersonAnalytics(person.id, person.groupId, tz);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/s/:token/analytics?tz=
 * Public share link analytics (scoped strictly to req.person from privacyMiddleware).
 */
export async function getPublicShareAnalytics(req, res, next) {
  try {
    const tz = req.query.tz || 'Asia/Kolkata';
    const person = req.person;

    if (!person) {
      return res.status(404).json({
        success: false,
        error: { code: 'STATEMENT_NOT_FOUND', message: 'This shared statement link is invalid.' },
      });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    const data = await calculatePersonAnalytics(person.id, person.groupId, tz);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/analytics?days=14|30|90
 * Admin overview analytics (re-reads role from DB on every request).
 */
export async function getAdminAnalytics(req, res, next) {
  try {
    const days = req.query.days || '14';

    // Re-read role from DB on every request
    const [freshUser] = await db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!freshUser || !freshUser.isActive || freshUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required.' },
      });
    }

    res.setHeader('Cache-Control', 'private, max-age=60');
    const data = await calculateAdminAnalytics(days);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
