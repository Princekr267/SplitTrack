import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import {
  users,
  groups,
  people,
  expenses,
  expenseSplits,
  payments,
  recoveryCodes,
  passwordResets,
  resetRequests,
  authRateLimits,
  auditLogs,
} from '../models/index.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { calculateUserStats } from '../services/balanceService.js';
import { createGroupWithHost } from '../services/groupService.js';

describe('Phase 2: Admin-Issued Resets, Profile & Username/UPI Visibility', () => {
  beforeEach(async () => {
    // Clear in proper foreign key order
    await db.delete(passwordResets);
    await db.delete(resetRequests);
    await db.delete(recoveryCodes);
    await db.delete(expenseSplits);
    await db.delete(expenses);
    await db.delete(payments);
    await db.delete(people);
    await db.delete(groups);
    await db.delete(authRateLimits);
    await db.delete(auditLogs);
    await db.delete(users);
  });

  // Helper to register and return user + agent with cookies
  async function registerAndLogin(name, username, password = 'password123!', role = 'user') {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name, username, password });
    expect(regRes.status).toBe(201);
    const user = regRes.body.data.user;

    if (role === 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
      user.role = 'admin';
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username, password });
    expect(loginRes.status).toBe(200);

    const cookies = loginRes.headers['set-cookie'];
    return { user, cookies };
  }

  // 1. User profile read/update strictly own data, validation of name/phone/email/UPI
  it('1. User profile read/update strictly own data, validation of name/phone/email/UPI', async () => {
    const { user, cookies } = await registerAndLogin('Alice Host', 'alice_h');

    // Read profile
    const getRes = await request(app)
      .get('/api/me')
      .set('Cookie', cookies);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.user.id).toBe(user.id);
    expect(getRes.body.data.user.username).toBe('alice_h');
    expect(getRes.body.data.user.name).toBe('Alice Host');
    expect(getRes.body.data.recoveryCodesRemaining).toBe(8);

    // Update profile with valid phone, email, avatarColor, upiId, showUpi
    const patchRes = await request(app)
      .patch('/api/me/profile')
      .set('Cookie', cookies)
      .send({
        name: 'Alice Wonder',
        email: 'alice@example.com',
        phone: '9876543210',
        avatarColor: 'emerald',
        upiId: 'alice@okhdfcbank',
        showUpi: true,
        defaultPaymentMode: 'online',
        defaultSplitType: 'percentage',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.name).toBe('Alice Wonder');
    expect(patchRes.body.data.email).toBe('alice@example.com');
    expect(patchRes.body.data.phone).toBe('9876543210');
    expect(patchRes.body.data.avatarColor).toBe('emerald');
    expect(patchRes.body.data.upiId).toBe('alice@okhdfcbank');
    expect(patchRes.body.data.showUpi).toBe(true);
    expect(patchRes.body.data.defaultSplitType).toBe('percentage');

    // Validation rejects: invalid UPI, invalid email, invalid phone
    const badEmailRes = await request(app)
      .patch('/api/me/profile')
      .set('Cookie', cookies)
      .send({ email: 'not-an-email' });
    expect(badEmailRes.status).toBe(400);

    const badUpiRes = await request(app)
      .patch('/api/me/profile')
      .set('Cookie', cookies)
      .send({ upiId: 'invalid upi with spaces@@' });
    expect(badUpiRes.status).toBe(400);

    const badPhoneRes = await request(app)
      .patch('/api/me/profile')
      .set('Cookie', cookies)
      .send({ phone: '123' });
    expect(badPhoneRes.status).toBe(400);
  });

  // 2. Change password requires current password, keeps current session, signs out other sessions
  it('2. Change password requires current password, keeps current session, signs out other sessions', async () => {
    const { user, cookies: session1Cookies } = await registerAndLogin('Bob Builder', 'bob_b', 'initialPass123!');

    // Second login on another "device"
    const login2Res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob_b', password: 'initialPass123!' });
    const session2Cookies = login2Res.headers['set-cookie'];

    // Session 2 is currently valid
    const checkBeforeRes = await request(app)
      .get('/api/me')
      .set('Cookie', session2Cookies);
    expect(checkBeforeRes.status).toBe(200);

    // Fail change password with wrong current password
    const failChangeRes = await request(app)
      .post('/api/me/change-password')
      .set('Cookie', session1Cookies)
      .send({
        currentPassword: 'wrongPassword123!',
        newPassword: 'brandNewPassword99!',
      });
    expect(failChangeRes.status).toBe(401);

    // Successful change password on Session 1
    const successChangeRes = await request(app)
      .post('/api/me/change-password')
      .set('Cookie', session1Cookies)
      .send({
        currentPassword: 'initialPass123!',
        newPassword: 'brandNewPassword99!',
      });
    expect(successChangeRes.status).toBe(200);
    const updatedSession1Cookies = successChangeRes.headers['set-cookie'];

    // Current session (Session 1 with re-issued cookie) stays logged in
    const checkCurrentRes = await request(app)
      .get('/api/me')
      .set('Cookie', updatedSession1Cookies);
    expect(checkCurrentRes.status).toBe(200);

    // Other session (Session 2) is invalidated because token_version was incremented
    const checkSession2Res = await request(app)
      .get('/api/me')
      .set('Cookie', session2Cookies);
    expect(checkSession2Res.status).toBe(401);

    // Can log in with new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob_b', password: 'brandNewPassword99!' });
    expect(newLoginRes.status).toBe(200);
  });

  // 3. Host UPI absent when showUpi off, present when on; UPI deep link encoded
  it('3. Host UPI absent when showUpi off, present when on', async () => {
    const { user: hostUser, cookies: hostCookies } = await registerAndLogin('Charlie Host', 'charlie_h');
    const { user: friendUser, cookies: friendCookies } = await registerAndLogin('David Friend', 'david_f');

    // Create group
    const { group, hostPerson } = await createGroupWithHost({
      name: 'Weekend Trip',
      user: hostUser,
    });

    // Add David as friend and link him
    const [friendPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'David',
        linkedUserId: friendUser.id,
        isHost: false,
      })
      .returning();

    // 3a. Host has UPI set, but showUpi is false by default
    await db.update(users).set({ upiId: 'charlie@okhdfcbank', showUpi: false }).where(eq(users.id, hostUser.id));

    const groupWhenOffRes = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Cookie', friendCookies);
    expect(groupWhenOffRes.status).toBe(200);
    expect(groupWhenOffRes.body.data.hostUpi).toBeUndefined();

    const statementWhenOffRes = await request(app)
      .get(`/api/groups/${group.id}/people/${friendPerson.id}/statement`)
      .set('Cookie', friendCookies);
    expect(statementWhenOffRes.status).toBe(200);
    expect(statementWhenOffRes.body.data.hostUpi).toBeUndefined();

    // 3b. Host enables showUpi: true
    await db.update(users).set({ showUpi: true }).where(eq(users.id, hostUser.id));

    const groupWhenOnRes = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Cookie', friendCookies);
    expect(groupWhenOnRes.status).toBe(200);
    expect(groupWhenOnRes.body.data.hostUpi).toBe('charlie@okhdfcbank');

    const statementWhenOnRes = await request(app)
      .get(`/api/groups/${group.id}/people/${friendPerson.id}/statement`)
      .set('Cookie', friendCookies);
    expect(statementWhenOnRes.status).toBe(200);
    expect(statementWhenOnRes.body.data.hostUpi).toBe('charlie@okhdfcbank');
  });

  // 4. Data export contains only user's own data, no hashes/tokens/others' private data
  it('4. Data export contains only user\'s own data, no hashes/tokens/others\' private data', async () => {
    const { user, cookies } = await registerAndLogin('Eva Export', 'eva_e');

    const exportRes = await request(app)
      .get('/api/me/export')
      .set('Cookie', cookies);

    expect(exportRes.status).toBe(200);
    const data = exportRes.body.data;
    expect(data.exportedAt).toBeDefined();
    expect(data.user.id).toBe(user.id);
    expect(data.user.username).toBe('eva_e');

    // Never includes password hash, tokens, or security hashes
    expect(data.user.passwordHash).toBeUndefined();
    expect(data.user.tokenVersion).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('passwordHash');
    expect(JSON.stringify(data)).not.toContain('tokenHash');
    expect(JSON.stringify(data)).not.toContain('codeHash');
  });

  // 5. Username visibility rules (absent in share link and copy messages, present for linked members to host)
  it('5. Username visibility rules: absent in share link, present for linked members to host, hidden between friends unless canViewAllBills', async () => {
    const { user: hostUser, cookies: hostCookies } = await registerAndLogin('Host Harry', 'host_harry');
    const { user: friend1User, cookies: friend1Cookies } = await registerAndLogin('Frank One', 'frank_1');
    const { user: friend2User, cookies: friend2Cookies } = await registerAndLogin('George Two', 'george_2');

    const { group } = await createGroupWithHost({
      name: 'Camp Trip',
      user: hostUser,
    });

    const [p1] = await db.insert(people).values({
      groupId: group.id,
      name: 'Frankie',
      linkedUserId: friend1User.id,
      shareEnabled: true,
      shareTokenHash: 'mock_share_token_hash',
      isHost: false,
      canViewAllBills: false,
    }).returning();

    const [p2] = await db.insert(people).values({
      groupId: group.id,
      name: 'Georgie',
      linkedUserId: friend2User.id,
      isHost: false,
      canViewAllBills: false,
    }).returning();

    // 5a. Host views group: sees both linked members' usernames
    const hostViewRes = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Cookie', hostCookies);
    expect(hostViewRes.status).toBe(200);
    const peopleForHost = hostViewRes.body.data.people;
    const f1HostView = peopleForHost.find(p => p.id === p1.id);
    const f2HostView = peopleForHost.find(p => p.id === p2.id);
    expect(f1HostView.username).toBe('frank_1');
    expect(f2HostView.username).toBe('george_2');

    // 5b. Friend 1 (canViewAllBills = false) views group:
    // Sees host username, own username, but NOT friend 2's username
    const friend1ViewRes = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Cookie', friend1Cookies);
    expect(friend1ViewRes.status).toBe(200);
    const peopleForFriend1 = friend1ViewRes.body.data.people;
    const f1ViewOfSelf = peopleForFriend1.find(p => p.id === p1.id);
    const f1ViewOfF2 = peopleForFriend1.find(p => p.id === p2.id);
    expect(f1ViewOfSelf.username).toBe('frank_1');
    expect(f1ViewOfF2.username).toBeNull();

    // 5c. Host grants canViewAllBills to Friend 1
    await db.update(people).set({ canViewAllBills: true }).where(eq(people.id, p1.id));
    const friend1ViewGrantedRes = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Cookie', friend1Cookies);
    expect(friend1ViewGrantedRes.status).toBe(200);
    const f1ViewOfF2Granted = friend1ViewGrantedRes.body.data.people.find(p => p.id === p2.id);
    expect(f1ViewOfF2Granted.username).toBe('george_2');
  });

  // 6. Admin reset credential generation: 403 on admin targets, requires reason & admin password, single-use, marks request fulfilled
  it('6. Admin reset credential generation: 403 on admin targets, requires reason & admin pw, marks request fulfilled', async () => {
    const { user: adminUser, cookies: adminCookies } = await registerAndLogin('Admin Master', 'admin_master', 'adminSecretPass!', 'admin');
    const { user: anotherAdmin, cookies: anotherAdminCookies } = await registerAndLogin('Co Admin', 'co_admin', 'coAdminSecretPass!', 'admin');
    const { user: targetUser } = await registerAndLogin('Target User', 'target_u', 'targetPass123!');

    // 6a. Target user creates a reset request
    const [requestRow] = await db
      .insert(resetRequests)
      .values({
        userId: targetUser.id,
        status: 'open',
      })
      .returning();

    // Verify request appears in admin reset queue
    const queueRes = await request(app)
      .get('/api/admin/reset-requests')
      .set('Cookie', adminCookies);
    expect(queueRes.status).toBe(200);
    const reqList = queueRes.body.data.requests || queueRes.body.data;
    expect(reqList.some(r => r.id === requestRow.id)).toBe(true);

    // 6b. Attempt to generate reset for another admin -> 403 Forbidden
    const adminTargetRes = await request(app)
      .post(`/api/admin/users/${anotherAdmin.id}/reset-credential`)
      .set('Cookie', adminCookies)
      .send({
        reason: 'Reset request for admin',
        currentPassword: 'adminSecretPass!',
      });
    expect(adminTargetRes.status).toBe(403);
    expect(adminTargetRes.body.error.code).toBe('FORBIDDEN');

    // 6c. Attempt with wrong admin password -> 401
    const badPwRes = await request(app)
      .post(`/api/admin/users/${targetUser.id}/reset-credential`)
      .set('Cookie', adminCookies)
      .send({
        reason: 'User forgot password in WhatsApp support',
        currentPassword: 'wrongAdminPassword!',
      });
    expect(badPwRes.status).toBe(401);

    // 6d. Successful generation for regular user
    const genRes = await request(app)
      .post(`/api/admin/users/${targetUser.id}/reset-credential`)
      .set('Cookie', adminCookies)
      .send({
        reason: 'User verified via WhatsApp call',
        currentPassword: 'adminSecretPass!',
        expiresInHours: 2,
        requestId: requestRow.id,
      });

    expect(genRes.status).toBe(200);
    expect(genRes.body.data.link).toContain('/reset-password?token=');
    expect(genRes.body.data.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(genRes.body.data.whatsappMessage).toContain('@target_u');
    expect(genRes.body.data.whatsappMessage).toContain(genRes.body.data.code);

    // Check request was marked fulfilled
    const [updatedReq] = await db.select().from(resetRequests).where(eq(resetRequests.id, requestRow.id));
    expect(updatedReq.status).toBe('fulfilled');
    expect(updatedReq.handledBy).toBe(adminUser.id);
  });

  // 7. Profile summary stats match balanceService
  it('7. Profile summary stats match balanceService calculations strictly from own data', async () => {
    const { user: hostUser, cookies: hostCookies } = await registerAndLogin('Host Maya', 'maya_h');
    const { user: friendUser, cookies: friendCookies } = await registerAndLogin('Friend Dev', 'dev_f');

    // Create group hosted by Maya
    const { group, hostPerson } = await createGroupWithHost({
      name: 'Goa Trip',
      user: hostUser,
    });

    // Add friend Dev
    const [devPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Dev',
        linkedUserId: friendUser.id,
        isHost: false,
      })
      .returning();

    // Host pays ₹1000 expense, split 50-50 (₹500 each)
    const [exp] = await db
      .insert(expenses)
      .values({
        groupId: group.id,
        title: 'Dinner',
        totalAmount: 100000, // ₹1,000.00
        paidByPersonId: hostPerson.id,
        createdBy: hostUser.id,
        splitType: 'equal',
      })
      .returning();

    await db.insert(expenseSplits).values([
      { groupId: group.id, expenseId: exp.id, personId: hostPerson.id, amount: 50000 },
      { groupId: group.id, expenseId: exp.id, personId: devPerson.id, amount: 50000 },
    ]);

    // Maya stats: groupsHosted = 1, totalOwedToMe = 50000, totalIOwe = 0
    const mayaStats = await calculateUserStats(hostUser.id);
    expect(mayaStats.groupsHosted).toBe(1);
    expect(mayaStats.totalOwedToMe).toBe(50000);
    expect(mayaStats.totalIOwe).toBe(0);

    // Dev stats: linkedProfiles = 1, totalIOwe = 50000, totalOwedToMe = 0
    const devStats = await calculateUserStats(friendUser.id);
    expect(devStats.linkedProfiles).toBe(1);
    expect(devStats.totalIOwe).toBe(50000);
    expect(devStats.totalOwedToMe).toBe(0);

    // Validate that GET /api/me returns these matching stats
    const meMaya = await request(app).get('/api/me').set('Cookie', hostCookies);
    expect(meMaya.body.data.stats.totalOwedToMe).toBe(50000);
    expect(meMaya.body.data.stats.totalIOwe).toBe(0);

    const meDev = await request(app).get('/api/me').set('Cookie', friendCookies);
    expect(meDev.body.data.stats.totalIOwe).toBe(50000);
    expect(meDev.body.data.stats.totalOwedToMe).toBe(0);
  });
});
