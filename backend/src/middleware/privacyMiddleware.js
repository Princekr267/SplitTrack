import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { people, users, groups } from '../models/index.js';
import { hashToken } from '../services/tokenService.js';

/**
 * Privacy Middleware
 * Resolves the viewing person profile ONCE from either:
 * 1. Read-only share token hash in req.params.token or req.query.token (Level 1)
 * 2. Logged-in user's linked person profile (Level 2)
 * 
 * Attaches req.person and req.viewMode ('public' | 'claimed').
 * Guarantees that friends NEVER see other group members' balances, splits, or payments.
 */
export async function resolveViewingPerson(req, res, next) {
  try {
    const rawToken = req.params.token || req.query.token;

    // Case 1: Public View Link via Token (/s/:token)
    if (rawToken) {
      const tokenHash = hashToken(rawToken);

      const [person] = await db
        .select({
          id: people.id,
          groupId: people.groupId,
          name: people.name,
          phone: people.phone,
          note: people.note,
          isHost: people.isHost,
          linkedUserId: people.linkedUserId,
          shareEnabled: people.shareEnabled,
          lastViewedAt: people.lastViewedAt,
          isDeleted: people.isDeleted,
        })
        .from(people)
        .where(
          and(
            eq(people.shareTokenHash, tokenHash),
            eq(people.shareEnabled, true),
            eq(people.isDeleted, false)
          )
        );

      // Return the SAME generic 404 for invalid, revoked, or non-existent tokens
      if (!person || person.isHost) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STATEMENT_NOT_FOUND',
            message: 'This shared statement link is invalid, expired, or has been revoked.',
          },
        });
      }

      // Verify the group itself is active and owner is active
      const [group] = await db
        .select({ id: groups.id, name: groups.name, status: groups.status, createdBy: groups.createdBy })
        .from(groups)
        .where(and(eq(groups.id, person.groupId), eq(groups.isDeleted, false)));

      if (!group) {
        return res.status(404).json({
          success: false,
          error: { code: 'STATEMENT_NOT_FOUND', message: 'This shared statement link is invalid.' },
        });
      }

      // Verify host user is active
      const [hostUser] = await db
        .select({ isActive: users.isActive })
        .from(users)
        .where(eq(users.id, group.createdBy));

      if (!hostUser || !hostUser.isActive) {
        return res.status(404).json({
          success: false,
          error: { code: 'STATEMENT_NOT_FOUND', message: 'This shared statement link is invalid.' },
        });
      }

      // Update last_viewed_at at most once per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (!person.lastViewedAt || new Date(person.lastViewedAt) < oneHourAgo) {
        db.update(people)
          .set({ lastViewedAt: new Date() })
          .where(eq(people.id, person.id))
          .catch(() => {});
      }

      req.person = person;
      req.group = group;
      req.viewMode = 'public';
      return next();
    }

    // Case 2: Logged-in Friend accessing via linkedUserId
    if (req.user) {
      const personId = req.params.personId || req.body.personId;
      const groupId = req.params.groupId || req.body.groupId;

      let query = and(
        eq(people.linkedUserId, req.user.id),
        eq(people.isDeleted, false),
        eq(people.isHost, false)
      );

      if (personId) {
        query = and(query, eq(people.id, personId));
      }
      if (groupId) {
        query = and(query, eq(people.groupId, groupId));
      }

      const [person] = await db
        .select({
          id: people.id,
          groupId: people.groupId,
          name: people.name,
          phone: people.phone,
          note: people.note,
          isHost: people.isHost,
          linkedUserId: people.linkedUserId,
          shareEnabled: people.shareEnabled,
          isDeleted: people.isDeleted,
        })
        .from(people)
        .where(query);

      if (!person) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_PROFILE',
            message: 'You do not have permission to view or manage this profile.',
          },
        });
      }

      const [group] = await db
        .select({ id: groups.id, name: groups.name, status: groups.status })
        .from(groups)
        .where(and(eq(groups.id, person.groupId), eq(groups.isDeleted, false)));

      req.person = person;
      req.group = group;
      req.viewMode = 'claimed';
      return next();
    }

    // Neither token nor logged-in user
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication or share token required.' },
    });
  } catch (error) {
    next(error);
  }
}
