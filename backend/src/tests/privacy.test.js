import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, groups, people } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { generateSecureToken, hashToken } from '../services/tokenService.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

describe('privacyMiddleware: Strict Member Scoping & Public Share Link Privacy', () => {
  it('returns generic 404 for non-existent, invalid, or revoked share tokens', async () => {
    // 1. Completely random non-existent token
    const res1 = await request(app).get('/api/s/invalidtoken1234567890abcdef');
    expect(res1.status).toBe(404);
    expect(res1.body.error.code).toBe('STATEMENT_NOT_FOUND');

    // 2. Setup user and group with a revoked token
    const [host] = await db
      .insert(users)
      .values({ name: 'Host', email: 'host_privacy@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Secret Group', user: host });

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Person with shareEnabled = false (revoked)
    await db.insert(people).values({
      groupId: group.id,
      name: 'Friend Revoked',
      shareTokenHash: tokenHash,
      shareEnabled: false,
    });

    const res2 = await request(app).get(`/api/s/${rawToken}`);
    expect(res2.status).toBe(404);
    // Exact same error message and code to prevent enumeration!
    expect(res2.body.error.code).toBe('STATEMENT_NOT_FOUND');
    expect(res2.body.error.message).toBe(res1.body.error.message);
  });

  it('ensures public view link returns strictly only that person profile data, never other members', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Arjun', email: 'arjun_priv@test.com', passwordHash: 'hash' })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Private Outing', user: host });

    const tokenAlice = generateSecureToken();
    const [alice] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Alice Private',
        shareTokenHash: hashToken(tokenAlice),
        shareEnabled: true,
      })
      .returning();

    // Bob
    await db.insert(people).values({
      groupId: group.id,
      name: 'Bob Secret',
      isHost: false,
    });

    const res = await request(app).get(`/api/s/${tokenAlice}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Alice's data is returned
    expect(res.body.data.person.name).toBe('Alice Private');
    expect(res.body.data.group.name).toBe('Private Outing');

    // Response must NOT contain other members
    const jsonStr = JSON.stringify(res.body.data);
    expect(jsonStr).not.toContain('Bob Secret');
  });

  it('prevents a friend from accessing host-only routes or modifying the group', async () => {
    // Create host and friend users
    const [host] = await db
      .insert(users)
      .values({ name: 'Host V', email: 'host_v@test.com', passwordHash: 'hash' })
      .returning();

    const [friendUser] = await db
      .insert(users)
      .values({ name: 'Friend F', email: 'friend_f@test.com', passwordHash: 'hash' })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Protected Group', user: host });

    // Link friendUser to a person profile in group
    await db.insert(people).values({
      groupId: group.id,
      name: 'Friend Person',
      linkedUserId: friendUser.id,
    });

    const friendToken = jwt.sign({ userId: friendUser.id }, env.JWT_SECRET);

    // Friend attempts to delete the group or add a person -> Must be 403 Forbidden!
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
