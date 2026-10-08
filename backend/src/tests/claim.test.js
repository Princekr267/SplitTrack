import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, groups, people } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { generateSecureToken, hashToken } from '../services/tokenService.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

describe('inviteController: Single-Use Claim Flow & Concurrency Race Protection', () => {
  it('allows a friend user to claim an unclaimed profile with a valid invite code', async () => {
    // 1. Host creates group
    const [host] = await db
      .insert(users)
      .values({ name: 'Host H', email: 'host_claim@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Dinner Group', user: host });

    // 2. Add unclaimed friend profile with invite code
    const rawInviteCode = generateSecureToken();
    const codeHash = hashToken(rawInviteCode);

    const [unclaimedPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Suresh Friend',
        inviteCodeHash: codeHash,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // 3. Registered friend logs in
    const [friendUser] = await db
      .insert(users)
      .values({ name: 'Suresh User', email: 'suresh@test.com', passwordHash: 'hash' })
      .returning();

    const friendToken = jwt.sign({ userId: friendUser.id }, env.JWT_SECRET);

    // 4. Accept invite code
    const res = await request(app)
      .post(`/api/invite/${rawInviteCode}/accept`)
      .set('Cookie', [`splittrack_token=${friendToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.linkedUserId).toBe(friendUser.id);
    expect(res.body.data.inviteCodeHash).toBeNull();

    // 5. Attempting to use the same invite code again must fail (single-use)
    const resSecond = await request(app)
      .post(`/api/invite/${rawInviteCode}/accept`)
      .set('Cookie', [`splittrack_token=${friendToken}`]);

    expect(resSecond.status).toBe(404);
    expect(resSecond.body.error.code).toBe('INVITE_INVALID');
  });

  it('protects against concurrent claim race conditions (only 1 can succeed)', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Race', email: 'host_race@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Race Group', user: host });

    const rawInviteCode = generateSecureToken();
    const codeHash = hashToken(rawInviteCode);

    await db.insert(people).values({
      groupId: group.id,
      name: 'Prize Profile',
      inviteCodeHash: codeHash,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Create 2 distinct friend accounts racing to claim
    const [userA] = await db
      .insert(users)
      .values({ name: 'Competitor A', email: 'user_a@test.com', passwordHash: 'hash' })
      .returning();

    const [userB] = await db
      .insert(users)
      .values({ name: 'Competitor B', email: 'user_b@test.com', passwordHash: 'hash' })
      .returning();

    const tokenA = jwt.sign({ userId: userA.id }, env.JWT_SECRET);
    const tokenB = jwt.sign({ userId: userB.id }, env.JWT_SECRET);

    // Run both accept requests in parallel
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/invite/${rawInviteCode}/accept`)
        .set('Cookie', [`splittrack_token=${tokenA}`]),
      request(app)
        .post(`/api/invite/${rawInviteCode}/accept`)
        .set('Cookie', [`splittrack_token=${tokenB}`]),
    ]);

    // Exactly one must succeed (200) and the other must fail (404 or 409)
    const statuses = [resA.status, resB.status].sort();
    expect(statuses[0]).toBe(200);
    expect([404, 409]).toContain(statuses[1]);
  });
});
