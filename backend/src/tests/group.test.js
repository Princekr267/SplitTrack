import { describe, it, expect } from 'vitest';
import { db } from '../config/db.js';
import { users, groups, people } from '../models/index.js';
import {
  createGroupWithHost,
  settleGroup,
  reopenGroup,
  ensureGroupNotSettled,
  GroupOperationError,
} from '../services/groupService.js';

describe('groupService: Host person atomicity, constraints & settle lifecycle', () => {
  it('creates group and host person atomically in the same transaction', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Kabir Host',
        email: 'kabir@splittrack.test',
        passwordHash: 'hash',
      })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({
      name: 'Weekend Getaway',
      description: 'Lonavala trip',
      user,
      ipAddress: '127.0.0.1',
    });

    expect(group.id).toBeDefined();
    expect(group.name).toBe('Weekend Getaway');
    expect(group.status).toBe('active');

    expect(hostPerson.id).toBeDefined();
    expect(hostPerson.groupId).toBe(group.id);
    expect(hostPerson.name).toBe('Kabir Host');
    expect(hostPerson.isHost).toBe(true);
    expect(hostPerson.linkedUserId).toBe(user.id);
  });

  it('enforces partial unique index: exactly one isHost = true per group', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Host User',
        email: 'host_dup@splittrack.test',
        passwordHash: 'hash',
      })
      .returning();

    const { group } = await createGroupWithHost({
      name: 'Single Host Group',
      user,
    });

    // Attempting to insert a second isHost = true person in the same group must fail
    await expect(
      db.insert(people).values({
        groupId: group.id,
        name: 'Second Fake Host',
        isHost: true,
      })
    ).rejects.toThrow();
  });

  it('allows settling a group when all balances are zero and locks modifications', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Host Settler',
        email: 'settle@splittrack.test',
        passwordHash: 'hash',
      })
      .returning();

    const { group } = await createGroupWithHost({
      name: 'Clean Group',
      user,
    });

    // Since there are no expenses, all balances are 0 => settle succeeds
    const settled = await settleGroup({
      groupId: group.id,
      user,
      ipAddress: '127.0.0.1',
    });

    expect(settled.status).toBe('settled');

    // Attempting to check if group is not settled will now throw error
    await expect(ensureGroupNotSettled(group.id)).rejects.toThrow(
      'This group is settled and locked. Please reopen the group to add or modify records.'
    );

    // Reopen group succeeds
    const reopened = await reopenGroup({
      groupId: group.id,
      user,
      ipAddress: '127.0.0.1',
    });

    expect(reopened.status).toBe('active');
    await expect(ensureGroupNotSettled(group.id)).resolves.toBeDefined();
  });
});
