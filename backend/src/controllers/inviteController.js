import { eq, and, sql, gt } from 'drizzle-orm';
import { db } from '../config/db.js';
import { people, groups } from '../models/index.js';
import { generateSecureToken, hashToken } from '../services/tokenService.js';
import { recordAuditLog } from '../services/auditService.js';
import env from '../config/env.js';

/**
 * Host generates a Level 2 single-use invite code for a person.
 */
export async function generateInviteCode(req, res, next) {
  try {
    const { groupId, personId } = req.params;

    const [person] = await db
      .select()
      .from(people)
      .where(
        and(
          eq(people.id, personId),
          eq(people.groupId, groupId),
          eq(people.isDeleted, false)
        )
      );

    if (!person) {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSON_NOT_FOUND', message: 'Person not found.' },
      });
    }

    if (person.isHost) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_INVITE_HOST', message: 'The host profile is already linked.' },
      });
    }

    if (person.linkedUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CLAIMED',
          message: 'This person profile has already been claimed by a user account.',
        },
      });
    }

    const rawCode = generateSecureToken();
    const codeHash = hashToken(rawCode);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db
      .update(people)
      .set({
        inviteCodeHash: codeHash,
        inviteExpiresAt: expiresAt,
      })
      .where(eq(people.id, personId));

    await recordAuditLog({
      actor: req.user,
      action: 'GENERATE_INVITE_CODE',
      entityType: 'Person',
      entityId: personId,
      groupId,
      after: { inviteExpiresAt: expiresAt },
      ipAddress: req.ip,
    });

    const inviteUrl = `${env.FRONTEND_URL}/invite/${rawCode}`;

    res.json({
      success: true,
      data: {
        rawCode,
        inviteUrl,
        expiresAt,
        message: 'Invite link generated. Valid for 7 days and single-use only.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public inspection of an invite code before claiming.
 */
export async function getInviteDetails(req, res, next) {
  try {
    const { code } = req.params;
    const codeHash = hashToken(code);

    const [person] = await db
      .select({
        id: people.id,
        groupId: people.groupId,
        name: people.name,
        linkedUserId: people.linkedUserId,
        inviteExpiresAt: people.inviteExpiresAt,
      })
      .from(people)
      .where(
        and(
          eq(people.inviteCodeHash, codeHash),
          eq(people.isDeleted, false)
        )
      );

    if (!person || person.linkedUserId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVITE_INVALID',
          message: 'This invite link is invalid, already claimed, or expired.',
        },
      });
    }

    if (person.inviteExpiresAt && new Date(person.inviteExpiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        error: { code: 'INVITE_EXPIRED', message: 'This invite link has expired.' },
      });
    }

    const [group] = await db
      .select({ id: groups.id, name: groups.name, description: groups.description })
      .from(groups)
      .where(eq(groups.id, person.groupId));

    res.json({
      success: true,
      data: {
        personName: person.name,
        groupName: group?.name || 'Group',
        groupDescription: group?.description || '',
        expiresAt: person.inviteExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Claim profile via invite code (Atomic race-free execution).
 */
export async function acceptInviteCode(req, res, next) {
  try {
    const { code } = req.params;
    const codeHash = hashToken(code);
    const userId = req.user.id;

    const result = await db.transaction(async (tx) => {
      // 1. First, check if this user already claimed a profile in this group
      // (Enforces one account per group)
      const [existingPerson] = await tx
        .select({ id: people.id, groupId: people.groupId })
        .from(people)
        .where(
          and(
            eq(people.inviteCodeHash, codeHash),
            eq(people.isDeleted, false)
          )
        );

      if (!existingPerson) {
        throw {
          status: 404,
          code: 'INVITE_INVALID',
          message: 'Invite link is invalid or already claimed.',
        };
      }

      const [alreadyClaimedInGroup] = await tx
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.groupId, existingPerson.groupId),
            eq(people.linkedUserId, userId),
            eq(people.isDeleted, false)
          )
        );

      if (alreadyClaimedInGroup) {
        throw {
          status: 400,
          code: 'ALREADY_MEMBER',
          message: 'Your account is already linked to a profile in this group.',
        };
      }

      // 2. Atomic update with WHERE linked_user_id IS NULL to prevent concurrent race conditions
      const now = new Date();
      const [claimedPerson] = await tx
        .update(people)
        .set({
          linkedUserId: userId,
          inviteCodeHash: null,
          inviteExpiresAt: null,
        })
        .where(
          and(
            eq(people.inviteCodeHash, codeHash),
            sql`${people.linkedUserId} IS NULL`,
            sql`(${people.inviteExpiresAt} IS NULL OR ${people.inviteExpiresAt} > ${now})`,
            eq(people.isDeleted, false)
          )
        )
        .returning();

      if (!claimedPerson) {
        throw {
          status: 409,
          code: 'CLAIM_RACE_LOST',
          message: 'This invite was already claimed or expired.',
        };
      }

      await recordAuditLog(
        {
          actor: req.user,
          action: 'CLAIM_PROFILE',
          entityType: 'Person',
          entityId: claimedPerson.id,
          groupId: claimedPerson.groupId,
          after: { linkedUserId: userId },
          ipAddress: req.ip,
        },
        tx
      );

      return claimedPerson;
    });

    res.json({
      success: true,
      message: 'Profile successfully linked to your account! 🎉',
      data: result,
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
}
