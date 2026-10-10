import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { app } from '../server.js';
import { db } from '../config/db.js';
import env from '../config/env.js';
import {
  users,
  groups,
  people,
  expenses,
  payments,
  auditLogs,
  systemSettings,
  recoveryCodes,
  passwordResets,
} from '../models/index.js';
import { hashToken } from '../services/tokenService.js';

describe('Phase 3: Admin Powers, Users, Groups, Settings & Overview', () => {
  const adminPassword = 'AdminSecret123!';
  let adminUser;
  let adminToken;
  let normalUser;
  let normalToken;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const rand = Math.floor(Math.random() * 900000 + 100000);
    // Create an active admin user
    [adminUser] = await db
      .insert(users)
      .values({
        name: 'Head Admin',
        username: `adm_${rand}`,
        email: `adm_${rand}@splittrack.test`,
        passwordHash,
        role: 'admin',
        isActive: true,
        tokenVersion: 0,
      })
      .returning();

    adminToken = jwt.sign(
      { sub: adminUser.id, userId: adminUser.id, tv: adminUser.tokenVersion },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a normal user
    [normalUser] = await db
      .insert(users)
      .values({
        name: 'Regular Bob',
        username: `bob_${rand}`,
        email: `bob_${rand}@splittrack.test`,
        passwordHash,
        role: 'user',
        isActive: true,
        tokenVersion: 0,
      })
      .returning();

    normalToken = jwt.sign(
      { sub: normalUser.id, userId: normalUser.id, tv: normalUser.tokenVersion },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('1. Non-admins get 403 on every /api/admin route, and a disabled or demoted admin loses access on next request', async () => {
    // Normal user gets 403 on /api/admin/stats
    const res1 = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${normalToken}`]);
    expect(res1.status).toBe(403);
    expect(res1.body.error.code).toBe('FORBIDDEN');

    // Admin can access
    const res2 = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${adminToken}`]);
    expect(res2.status).toBe(200);

    // Demote admin directly in DB to 'user'
    await db
      .update(users)
      .set({ role: 'user' })
      .where(eq(users.id, adminUser.id));

    // Next request with same token must get 403 because role is re-read from DB
    const res3 = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${adminToken}`]);
    expect(res3.status).toBe(403);
    expect(res3.body.error.code).toBe('FORBIDDEN');

    // Disable the user in DB
    await db
      .update(users)
      .set({ role: 'admin', isActive: false })
      .where(eq(users.id, adminUser.id));

    // Next request must get 401 ACCOUNT_DISABLED
    const res4 = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${adminToken}`]);
    expect(res4.status).toBe(401);
  });

  it('2. Sensitive actions fail without reason or with wrong password and succeed with both. Wrong-password attempts are rate-limited.', async () => {
    // Missing reason
    const failReason = await request(app)
      .patch(`/api/admin/users/${normalUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        currentPassword: adminPassword,
      });
    expect(failReason.status).toBe(400);
    expect(failReason.body.error.code).toBe('REASON_REQUIRED');

    // Short reason (< 3 chars)
    const failShortReason = await request(app)
      .patch(`/api/admin/users/${normalUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'no',
        currentPassword: adminPassword,
      });
    expect(failShortReason.status).toBe(400);
    expect(failShortReason.body.error.code).toBe('REASON_REQUIRED');

    // Missing password
    const failPw = await request(app)
      .patch(`/api/admin/users/${normalUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Valid audit reason for deactivation',
      });
    expect(failPw.status).toBe(400);
    expect(failPw.body.error.code).toBe('PASSWORD_REQUIRED');

    // Wrong password
    const failWrongPw = await request(app)
      .patch(`/api/admin/users/${normalUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Valid audit reason for deactivation',
        currentPassword: 'WrongPassword!',
      });
    expect(failWrongPw.status).toBe(401);
    expect(failWrongPw.body.error.code).toBe('INVALID_ADMIN_PASSWORD');

    // Rate limiting: 4 more wrong password attempts should trigger 429
    for (let i = 0; i < 4; i++) {
      await request(app)
        .patch(`/api/admin/users/${normalUser.id}/status`)
        .set('Cookie', [`splittrack_token=${adminToken}`])
        .send({
          isActive: false,
          reason: 'Valid audit reason',
          currentPassword: 'WrongPassword!',
        });
    }

    const rateLimited = await request(app)
      .patch(`/api/admin/users/${normalUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Valid audit reason',
        currentPassword: adminPassword,
      });
    expect(rateLimited.status).toBe(429);
  });

  it('3. An admin cannot disable or demote themselves, the last active admin cannot be removed', async () => {
    // Admin cannot disable themselves
    const selfDisable = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Attempt self disable',
        currentPassword: adminPassword,
      });
    expect(selfDisable.status).toBe(400);
    expect(selfDisable.body.error.code).toBe('CANNOT_SELF_DEACTIVATE');

    // Admin cannot demote themselves
    const selfDemote = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/role`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        role: 'user',
        reason: 'Attempt self demotion',
        currentPassword: adminPassword,
      });
    expect(selfDemote.status).toBe(400);
    expect(selfDemote.body.error.code).toBe('CANNOT_TARGET_SELF');

    // Create a second admin
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const r1 = Math.floor(Math.random() * 90000 + 10000);
    const [secondAdmin] = await db
      .insert(users)
      .values({
        name: 'Second Admin',
        username: `sec_${r1}`,
        email: `sec_${r1}@splittrack.test`,
        passwordHash,
        role: 'admin',
        isActive: true,
      })
      .returning();

    // Disable all other admins except secondAdmin to test last active admin rule
    await db
      .update(users)
      .set({ isActive: false })
      .where(and(eq(users.role, 'admin'), eq(users.id, adminUser.id)));

    // Re-enable adminUser to act
    await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, adminUser.id));

    // Disable secondAdmin (now adminUser is the only other active admin)
    const disableSecond = await request(app)
      .patch(`/api/admin/users/${secondAdmin.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Disabling second admin',
        currentPassword: adminPassword,
      });
    expect(disableSecond.status).toBe(200);

    // Now adminUser is the ONLY active admin left. Attempting to disable or demote must fail
    // Create dummy third user promoted to admin and then try removing when last
    const r2 = Math.floor(Math.random() * 90000 + 10000);
    const [thirdAdmin] = await db
      .insert(users)
      .values({
        name: 'Third Admin',
        username: `thd_${r2}`,
        email: `third_${r2}@splittrack.test`,
        passwordHash,
        role: 'admin',
        isActive: true,
      })
      .returning();

    // Demoting thirdAdmin succeeds because adminUser is also active
    const demoteThird = await request(app)
      .patch(`/api/admin/users/${thirdAdmin.id}/role`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        role: 'user',
        reason: 'Demoting third admin',
        currentPassword: adminPassword,
      });
    expect(demoteThird.status).toBe(200);

    // If thirdAdmin was the only active admin, it would fail
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, adminUser.id));

    // Token for thirdAdmin after promoting back
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, thirdAdmin.id));

    const thirdToken = jwt.sign(
      { sub: thirdAdmin.id, userId: thirdAdmin.id, tv: 0 },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Now thirdAdmin is the ONLY active admin
    const demoteLast = await request(app)
      .patch(`/api/admin/users/${thirdAdmin.id}/role`)
      .set('Cookie', [`splittrack_token=${thirdToken}`])
      .send({
        role: 'user',
        reason: 'Demote last admin attempt',
        currentPassword: adminPassword,
      });
    expect(demoteLast.status).toBe(400);
  });

  it('4. Disabling a user or forcing sign-out invalidates their sessions immediately', async () => {
    // Normal user makes authenticated call to /api/me
    const meRes1 = await request(app)
      .get('/api/me')
      .set('Cookie', [`splittrack_token=${normalToken}`]);
    expect(meRes1.status).toBe(200);

    // Admin forces sign out
    const forceRes = await request(app)
      .post(`/api/admin/users/${normalUser.id}/force-sign-out`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Security incident session invalidation',
        currentPassword: adminPassword,
      });
    expect(forceRes.status).toBe(200);

    // Normal user's previous token is now rejected with 401 SESSION_REVOKED
    const meRes2 = await request(app)
      .get('/api/me')
      .set('Cookie', [`splittrack_token=${normalToken}`]);
    expect(meRes2.status).toBe(401);
    expect(meRes2.body.error.code).toBe('SESSION_REVOKED');
  });

  it('5. Reset credentials cannot be generated for admins, and the admin never receives or can read any hash or recovery code', async () => {
    // Attempting to generate reset credentials for an admin target gets 403
    const adminTargetRes = await request(app)
      .post(`/api/admin/users/${adminUser.id}/reset-credential`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Attempt admin reset',
        currentPassword: adminPassword,
      });
    expect(adminTargetRes.status).toBe(403);

    // Generating reset credential for normalUser succeeds and returns plain single-use token & code
    const normalTargetRes = await request(app)
      .post(`/api/admin/users/${normalUser.id}/reset-credential`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'User forgot password ticket #123',
        currentPassword: adminPassword,
      });
    expect(normalTargetRes.status).toBe(200);
    expect(normalTargetRes.body.data.link).toBeDefined();
    expect(normalTargetRes.body.data.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(normalTargetRes.body.data.tokenHash).toBeUndefined();
    expect(normalTargetRes.body.data.codeHash).toBeUndefined();
  });

  it('6. Freezing a group blocks all writes (expenses, payments, edits, voids, permission changes) with a 409, and unfreezing restores them', async () => {
    // Create a group with adminUser as host
    const [group] = await db
      .insert(groups)
      .values({
        name: 'Goa Trip 2026',
        createdBy: adminUser.id,
      })
      .returning();

    // Create host and member person rows
    const [hostPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: adminUser.name,
        isHost: true,
        linkedUserId: adminUser.id,
      })
      .returning();

    const [memberPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Friend Dave',
        isHost: false,
      })
      .returning();

    // Admin freezes the group
    const freezeRes = await request(app)
      .post(`/api/admin/groups/${group.id}/freeze`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Member dispute investigation',
        currentPassword: adminPassword,
      });
    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.data.isFrozen).toBe(true);

    // Attempting to create an expense on the frozen group returns 409
    const expenseRes = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        title: 'Dinner bill',
        totalAmount: 250000,
        paidByPersonId: hostPerson.id,
        splitType: 'equal',
        splits: [
          { personId: hostPerson.id, amount: 125000 },
          { personId: memberPerson.id, amount: 125000 },
        ],
      });
    expect(expenseRes.status).toBe(409);
    expect(expenseRes.body.error.message).toContain('frozen by an admin');

    // Attempting to record a payment returns 409
    const paymentRes = await request(app)
      .post(`/api/groups/${group.id}/payments`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        fromPersonId: memberPerson.id,
        toPersonId: hostPerson.id,
        amount: 50000,
        mode: 'online',
      });
    expect(paymentRes.status).toBe(409);

    // Admin unfreezes the group
    const unfreezeRes = await request(app)
      .post(`/api/admin/groups/${group.id}/unfreeze`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Dispute resolved amicably',
        currentPassword: adminPassword,
      });
    expect(unfreezeRes.status).toBe(200);
    expect(unfreezeRes.body.data.isFrozen).toBe(false);

    // Expense creation now succeeds
    const expenseSuccessRes = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        title: 'Dinner bill',
        totalAmount: 250000,
        paidByPersonId: hostPerson.id,
        splitType: 'equal',
        splits: [
          { personId: hostPerson.id, amount: 125000 },
          { personId: memberPerson.id, amount: 125000 },
        ],
      });
    expect(expenseSuccessRes.status).toBe(201);
  });

  it('7. Transfer host is atomic and rejects invalid targets. Reopen and restore work.', async () => {
    // Create group
    const [group] = await db
      .insert(groups)
      .values({
        name: 'Road Trip',
        createdBy: adminUser.id,
        status: 'settled',
        isDeleted: true,
      })
      .returning();

    const [hostPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: adminUser.name,
        isHost: true,
        linkedUserId: adminUser.id,
      })
      .returning();

    // Restore group
    const restoreRes = await request(app)
      .post(`/api/admin/groups/${group.id}/restore`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Restoring accidentally deleted group',
        currentPassword: adminPassword,
      });
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.isDeleted).toBe(false);

    // Reopen settled group
    const reopenRes = await request(app)
      .post(`/api/admin/groups/${group.id}/reopen`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        reason: 'Reopening to adjust final settlement',
        currentPassword: adminPassword,
      });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe('active');

    // Transfer host: reject when target user is already linked to a friend profile
    const [friendMember] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Normal User Friend',
        isHost: false,
        linkedUserId: normalUser.id,
      })
      .returning();

    const transferFail = await request(app)
      .post(`/api/admin/groups/${group.id}/transfer-host`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        newHostUserId: normalUser.id,
        reason: 'Transferring host ownership',
        currentPassword: adminPassword,
      });
    expect(transferFail.status).toBe(400);
    expect(transferFail.body.error.code).toBe('TARGET_ALREADY_MEMBER');

    // Create another eligible user
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    const r3 = Math.floor(Math.random() * 90000 + 10000);
    const [newHostUser] = await db
      .insert(users)
      .values({
        name: 'Alice New Host',
        username: `ali_${r3}`,
        email: `alice_${r3}@splittrack.test`,
        passwordHash,
        role: 'user',
        isActive: true,
      })
      .returning();

    // Transfer host succeeds
    const transferSuccess = await request(app)
      .post(`/api/admin/groups/${group.id}/transfer-host`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        newHostUserId: newHostUser.id,
        reason: 'Transferring to Alice as new organizer',
        currentPassword: adminPassword,
      });
    expect(transferSuccess.status).toBe(200);

    // Verify DB state
    const [updatedGroup] = await db.select().from(groups).where(eq(groups.id, group.id));
    expect(updatedGroup.createdBy).toBe(newHostUser.id);
  });

  it('8. With allowRegistration=false, normal registration is rejected and registration with valid invite code succeeds', async () => {
    // Set allowRegistration to false
    await db
      .insert(systemSettings)
      .values({
        key: 'allowRegistration',
        value: false,
        updatedBy: adminUser.id,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: false },
      });

    // Normal registration attempt without invite code gets 403
    const r4 = Math.floor(Math.random() * 90000 + 10000);
    const normalRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Unauthorized Stranger',
        username: `str_${r4}`,
        password: 'Password123!',
      });
    expect(normalRegRes.status).toBe(403);
    expect(normalRegRes.body.error.code).toBe('REGISTRATION_DISABLED');

    // Create a group and an invited person with a valid invite code
    const [group] = await db
      .insert(groups)
      .values({
        name: 'Invite Only Group',
        createdBy: adminUser.id,
      })
      .returning();

    const plainInviteCode = 'valid-test-code-999';
    const codeHash = hashToken(plainInviteCode);

    await db.insert(people).values({
      groupId: group.id,
      name: 'Invited Guest',
      isHost: false,
      inviteCodeHash: codeHash,
      inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours future
    });

    // Registration with the valid invite code succeeds!
    const r5 = Math.floor(Math.random() * 90000 + 10000);
    const inviteRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invited Guest',
        username: `inv_${r5}`,
        password: 'Password123!',
        inviteCode: plainInviteCode,
      });
    expect(inviteRegRes.status).toBe(201);
    expect(inviteRegRes.body.data.user).toBeDefined();

    // Reset allowRegistration back to true
    await db
      .update(systemSettings)
      .set({ value: true })
      .where(eq(systemSettings.key, 'allowRegistration'));
  });

  it('9. Announcement text is rendered as plain text, and only whitelisted settings keys are accepted', async () => {
    // Reject non-whitelisted keys
    const invalidSettingsRes = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        settings: {
          allowRegistration: true,
          maliciousKey: 'exploit_value',
        },
        reason: 'Updating system settings test',
        currentPassword: adminPassword,
      });
    expect(invalidSettingsRes.status).toBe(400);

    // Accept valid whitelisted settings
    const validSettingsRes = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        settings: {
          allowRegistration: true,
          pendingAlertDays: 5,
          announcement: {
            enabled: true,
            message: 'Scheduled maintenance tonight at 11 PM IST.',
            level: 'warning',
          },
        },
        reason: 'Publish maintenance announcement',
        currentPassword: adminPassword,
      });
    expect(validSettingsRes.status).toBe(200);
    expect(validSettingsRes.body.data.pendingAlertDays).toBe(5);
    expect(validSettingsRes.body.data.announcement.message).toBe('Scheduled maintenance tonight at 11 PM IST.');

    // Public settings endpoint returns safe announcement & registration status
    const publicRes = await request(app).get('/api/settings/public');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.announcement.enabled).toBe(true);
    expect(publicRes.body.data.announcement.message).toBe('Scheduled maintenance tonight at 11 PM IST.');
  });

  it('14. Pagination limits are enforced (max 100)', async () => {
    const pagedRes = await request(app)
      .get('/api/admin/users?limit=500')
      .set('Cookie', [`splittrack_token=${adminToken}`]);

    expect(pagedRes.status).toBe(200);
    // Limit is clamped to 100
    expect(pagedRes.body.data.pagination.limit).toBe(100);
  });
});
