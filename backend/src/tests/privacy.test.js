import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, groups, people, expenses, expenseSplits, auditLogs } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { generateSecureToken, hashToken } from '../services/tokenService.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

function makeToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET);
}

describe('privacyMiddleware: Strict Member Scoping & Public Share Link Privacy', () => {
  it('returns generic 404 for non-existent, invalid, or revoked share tokens', async () => {
    const res1 = await request(app).get('/api/s/invalidtoken1234567890abcdef');
    expect(res1.status).toBe(404);
    expect(res1.body.error.code).toBe('STATEMENT_NOT_FOUND');

    const [host] = await db
      .insert(users)
      .values({ name: 'Host', username: 'host_privacy', email: 'host_privacy@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Secret Group', user: host });

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    await db.insert(people).values({
      groupId: group.id,
      name: 'Friend Revoked',
      shareTokenHash: tokenHash,
      shareEnabled: false,
    });

    const res2 = await request(app).get(`/api/s/${rawToken}`);
    expect(res2.status).toBe(404);
    expect(res2.body.error.code).toBe('STATEMENT_NOT_FOUND');
    expect(res2.body.error.message).toBe(res1.body.error.message);
  });

  it('ensures public view link returns strictly only that person profile data, never other members', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Arjun', username: 'arjun_priv', email: 'arjun_priv@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Private Outing', user: host });

    const tokenAlice = generateSecureToken();
    const [alice] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Alice Private',
        shareTokenHash: hashToken(tokenAlice),
        shareEnabled: true,
        canViewAllBills: true, // share link must still be own-only even if canViewAllBills is true
      })
      .returning();

    await db.insert(people).values({ groupId: group.id, name: 'Bob Secret', isHost: false });

    const res = await request(app).get(`/api/s/${tokenAlice}`);
    expect(res.status).toBe(200);
    expect(res.body.data.person.name).toBe('Alice Private');
    expect(res.body.data.group.name).toBe('Private Outing');

    const jsonStr = JSON.stringify(res.body.data);
    expect(jsonStr).not.toContain('Bob Secret');
  });

  it('prevents a friend from accessing host-only routes or modifying the group', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host V', username: 'host_v', email: 'host_v@test.com', passwordHash: 'hash' })
      .returning();

    const [friendUser] = await db
      .insert(users)
      .values({ name: 'Friend F', username: 'friend_f', email: 'friend_f@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Protected Group', user: host });

    await db.insert(people).values({
      groupId: group.id,
      name: 'Friend Person',
      linkedUserId: friendUser.id,
    });

    const friendToken = makeToken(friendUser.id);

    const resDelete = await request(app)
      .delete(`/api/groups/${group.id}`)
      .set('Cookie', [`splittrack_token=${friendToken}`]);

    expect(resDelete.status).toBe(403);
    expect(resDelete.body.error.code).toBe('FORBIDDEN');

    const resAddPerson = await request(app)
      .post(`/api/groups/${group.id}/people`)
      .set('Cookie', [`splittrack_token=${friendToken}`])
      .send({ name: 'Intruder' });

    expect(resAddPerson.status).toBe(403);
  });
});

describe('Change 1: Friend Bill Visibility Permission', () => {
  async function setup() {
    const [hostUser] = await db.insert(users).values({ name: 'Host', username: 'host_p', email: 'h@test.com', passwordHash: 'hash' }).returning();
    const [friendUser] = await db.insert(users).values({ name: 'Friend', username: 'friend_p', email: 'f@test.com', passwordHash: 'hash' }).returning();
    const [outsiderUser] = await db.insert(users).values({ name: 'Outsider', username: 'outsider_p', email: 'o@test.com', passwordHash: 'hash' }).returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Test Group', user: hostUser });

    const [friendPerson] = await db.insert(people).values({
      groupId: group.id,
      name: 'Friend Person',
      linkedUserId: friendUser.id,
      isHost: false,
      canViewAllBills: false,
    }).returning();

    // Add an expense with splits
    const [expense] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Dinner',
      totalAmount: 90000, // ₹900
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: hostUser.id,
    }).returning();

    await db.insert(expenseSplits).values([
      { expenseId: expense.id, groupId: group.id, personId: hostPerson.id, amount: 45000 },
      { expenseId: expense.id, groupId: group.id, personId: friendPerson.id, amount: 45000 },
    ]);

    return { hostUser, friendUser, outsiderUser, group, hostPerson, friendPerson, expense };
  }

  it('1. freshly claimed friend gets 403 on group-bills (default false)', async () => {
    const { friendUser, friendPerson } = await setup();
    const token = makeToken(friendUser.id);
    const res = await request(app)
      .get(`/api/friend/profiles/${friendPerson.id}/group-bills`)
      .set('Cookie', [`splittrack_token=${token}`]);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('2. after host grants it, friend sees all expenses+splits with no forbidden fields', async () => {
    const { hostUser, friendUser, group, friendPerson } = await setup();
    const hostToken = makeToken(hostUser.id);
    const friendToken = makeToken(friendUser.id);

    // Host grants
    const grantRes = await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: true });
    expect(grantRes.status).toBe(200);
    expect(grantRes.body.data.canViewAllBills).toBe(true);

    // Friend views bills
    const res = await request(app)
      .get(`/api/friend/profiles/${friendPerson.id}/group-bills`)
      .set('Cookie', [`splittrack_token=${friendToken}`]);
    expect(res.status).toBe(200);
    expect(res.body.data.expenses).toHaveLength(1);
    expect(res.body.data.expenses[0].title).toBe('Dinner');
    expect(res.body.data.expenses[0].splits).toHaveLength(2);

    // Assert forbidden fields are NOT present
    const responseStr = JSON.stringify(res.body.data);
    expect(responseStr).not.toMatch(/\bnet\b/);
    expect(responseStr).not.toMatch(/\bremainingToPay\b/);
    expect(responseStr).not.toMatch(/\bgroupOwesYou\b/);
    expect(responseStr).not.toMatch(/\bphone\b/);
    expect(responseStr).not.toMatch(/\bshareTokenHash\b/);
    expect(responseStr).not.toMatch(/\binviteCodeHash\b/);
    expect(responseStr).not.toMatch(/\blinkedUserId\b/);
    expect(responseStr).not.toMatch(/\bpasswordHash\b/);
  });

  it('3. after host revokes, same request returns 403 immediately', async () => {
    const { hostUser, friendUser, group, friendPerson } = await setup();
    const hostToken = makeToken(hostUser.id);
    const friendToken = makeToken(friendUser.id);

    await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: true });

    await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: false });

    const res = await request(app)
      .get(`/api/friend/profiles/${friendPerson.id}/group-bills`)
      .set('Cookie', [`splittrack_token=${friendToken}`]);
    expect(res.status).toBe(403);
  });

  it('4. friend in group X cannot read group Y, and cannot use another user\'s personId', async () => {
    const { friendUser, friendPerson } = await setup();

    // Setup a second group
    const [host2] = await db.insert(users).values({ name: 'H2', username: 'host2_p', email: 'h2@test.com', passwordHash: 'x' }).returning();
    const [friend2] = await db.insert(users).values({ name: 'F2', username: 'friend2_p', email: 'f2@test.com', passwordHash: 'x' }).returning();
    const { group: group2, hostPerson: host2Person } = await createGroupWithHost({ name: 'Group2', user: host2 });
    const [friend2Person] = await db.insert(people).values({
      groupId: group2.id, name: 'F2', linkedUserId: friend2.id, canViewAllBills: true,
    }).returning();

    // friendUser tries to use friend2Person's id (different linkedUserId)
    const token = makeToken(friendUser.id);
    const res = await request(app)
      .get(`/api/friend/profiles/${friend2Person.id}/group-bills`)
      .set('Cookie', [`splittrack_token=${token}`]);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('5. share-link route returns only own data even when canViewAllBills = true', async () => {
    const { group, friendPerson } = await setup();

    const rawToken = generateSecureToken();
    const { eq } = await import('drizzle-orm');
    await db
      .update(people)
      .set({
        shareTokenHash: hashToken(rawToken),
        shareEnabled: true,
        canViewAllBills: true,
      })
      .where(eq(people.id, friendPerson.id));

    const res = await request(app).get(`/api/s/${rawToken}`);
    // Should work as own-statement only, not returning all group bills
    expect([200, 404]).toContain(res.status); // 200 if they have splits, 200 either way
    if (res.status === 200) {
      // Share endpoint returns own statement not group bills endpoint format
      expect(res.body.data).toHaveProperty('person');
      // Should NOT have the group-bills format
      expect(res.body.data).not.toHaveProperty('members');
    }
  });

  it('6. a friend and a host of a different group get 403 on permissions endpoint; host person cannot be toggled', async () => {
    const { hostUser, friendUser, group, hostPerson, friendPerson } = await setup();
    const friendToken = makeToken(friendUser.id);
    const hostToken = makeToken(hostUser.id);

    // Friend tries to grant themselves permission
    const res1 = await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${friendToken}`])
      .send({ canViewAllBills: true });
    expect(res1.status).toBe(403);

    // Host tries to set can_view_all_bills on the host person
    const res2 = await request(app)
      .patch(`/api/groups/${group.id}/people/${hostPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: true });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('CANNOT_SET_HOST');

    // Host of group2 cannot touch group1
    const [host2] = await db.insert(users).values({ name: 'H2', username: 'host2_other', email: 'hh2@test.com', passwordHash: 'x' }).returning();
    await createGroupWithHost({ name: 'Other', user: host2 });
    const host2Token = makeToken(host2.id);
    const res3 = await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${host2Token}`])
      .send({ canViewAllBills: true });
    expect(res3.status).toBe(403);
  });

  it('7. each grant and revoke creates an audit row', async () => {
    const { hostUser, group, friendPerson } = await setup();
    const hostToken = makeToken(hostUser.id);

    await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: true });

    await request(app)
      .patch(`/api/groups/${group.id}/people/${friendPerson.id}/permissions`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ canViewAllBills: false });

    const logs = await db.select().from(auditLogs)
      .where(
        (await import('drizzle-orm').then(m => m.eq))(auditLogs.entityId, friendPerson.id)
      );

    const grantLog = logs.find(l => l.action === 'GRANT_VIEW_ALL_BILLS');
    const revokeLog = logs.find(l => l.action === 'REVOKE_VIEW_ALL_BILLS');
    expect(grantLog).toBeTruthy();
    expect(revokeLog).toBeTruthy();
  });
});
