import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, groups, people, expenses, expenseSplits, payments } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { calculateGroupBalances } from '../services/balanceService.js';
import { processSplits } from '../services/splitService.js';
import { generateSecureToken, hashToken } from '../services/tokenService.js';
import env from '../config/env.js';

function makeToken(user) {
  return jwt.sign({ sub: user.id, userId: user.id, role: user.role }, env.JWT_SECRET);
}

describe('Phase 1: Analytics & Ledger Invariants', () => {
  // Test 1: Random fuzz scenarios verifying sum(nets) === 0 and balances match balanceService
  it('1. Fuzz: sum of all nets equals 0 across random scenarios, and balances match balanceService', async () => {
    const [host] = await db
      .insert(users)
      .values({
        name: 'Host Fuzz',
        username: 'host_fuzz',
        role: 'user',
        passwordHash: 'dummy',
        isActive: true,
      })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({
      name: 'Fuzz Group',
      user: host,
    });

    const friendPersons = [];
    for (let i = 1; i <= 4; i++) {
      const [p] = await db
        .insert(people)
        .values({
          groupId: group.id,
          name: `Friend ${i}`,
          isHost: false,
        })
        .returning();
      friendPersons.push(p);
    }
    const allMembers = [hostPerson, ...friendPersons];

    // Create 5 varied expenses
    for (let e = 1; e <= 5; e++) {
      const payer = allMembers[e % allMembers.length];
      const amount = (e * 137000); // Varied paise
      const [exp] = await db
        .insert(expenses)
        .values({
          groupId: group.id,
          title: `Expense ${e}`,
          totalAmount: amount,
          date: new Date(Date.now() - e * 86400000),
          paidByPersonId: payer.id,
          splitType: 'equal',
          createdBy: host.id,
        })
        .returning();

      const splits = processSplits('equal', amount, [], allMembers.map((m) => m.id));
      await db.insert(expenseSplits).values(
        splits.map((s) => ({
          expenseId: exp.id,
          groupId: group.id,
          personId: s.personId,
          amount: s.amount,
        }))
      );
    }

    // Create 3 payments with various statuses
    await db.insert(payments).values([
      {
        groupId: group.id,
        fromPersonId: friendPersons[0].id,
        toPersonId: hostPerson.id,
        amount: 50000,
        status: 'accepted',
        mode: 'online',
        createdByType: 'host',
        decidedBy: host.id,
        decidedAt: new Date(),
      },
      {
        groupId: group.id,
        fromPersonId: friendPersons[1].id,
        toPersonId: hostPerson.id,
        amount: 25000,
        status: 'pending',
        mode: 'online',
        createdByType: 'friend',
      },
      {
        groupId: group.id,
        fromPersonId: friendPersons[2].id,
        toPersonId: hostPerson.id,
        amount: 15000,
        status: 'rejected',
        mode: 'cash',
        createdByType: 'friend',
        decidedBy: host.id,
        decidedAt: new Date(),
      },
    ]);

    const res = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Asia/Kolkata`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // Check balanceService matches
    const groundTruth = await calculateGroupBalances(group.id);
    expect(data.summary.totalSpent).toBe(groundTruth.summary.totalSpent);
    expect(data.summary.received).toBe(groundTruth.summary.totalReceived);
    expect(data.summary.pending).toBe(groundTruth.summary.totalPending);

    // Sum of nets must be exactly 0
    const netSum = data.balances.reduce((acc, b) => acc + b.net, 0);
    expect(netSum).toBe(0);

    // Each person's last sparkline value must equal -net
    for (const b of data.balances) {
      const lastSpark = b.sparkline[b.sparkline.length - 1];
      const expectedDue = b.net === 0 ? 0 : -b.net;
      expect(lastSpark).toBe(expectedDue);
    }

  });

  // Test 2: Invariant: Sum of aging buckets equals Σ max(0, -net)
  it('2. Aging invariant: sum of aging buckets equals Σ max(0, -net), with partial payments, friend-fronted expenses, voided payments and self-shares', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Aging', username: 'host_aging', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Aging Invariant Group', user: host });

    const [f1] = await db.insert(people).values({ groupId: group.id, name: 'Friend 1 (Fronts)', isHost: false }).returning();
    const [f2] = await db.insert(people).values({ groupId: group.id, name: 'Friend 2 (Partial)', isHost: false }).returning();
    const [f3] = await db.insert(people).values({ groupId: group.id, name: 'Friend 3 (Voided)', isHost: false }).returning();
    const allMembers = [hostPerson, f1, f2, f3];

    const now = Date.now();
    const day = 86400000;

    // Exp 1: 20 days ago (Cottage ₹12,000 paid by Host) -> Bucket 15+
    const [exp1] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Old Cottage',
      totalAmount: 1200000,
      date: new Date(now - 20 * day),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp1 = processSplits('equal', 1200000, [], allMembers.map(m => m.id));
    await db.insert(expenseSplits).values(sp1.map(s => ({ expenseId: exp1.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Exp 2: 10 days ago (Dinner ₹4,000 fronted by Friend 1!) -> Bucket 8-14
    const [exp2] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Cafe Fronted by F1',
      totalAmount: 400000,
      date: new Date(now - 10 * day),
      paidByPersonId: f1.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp2 = processSplits('equal', 400000, [], allMembers.map(m => m.id));
    await db.insert(expenseSplits).values(sp2.map(s => ({ expenseId: exp2.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Exp 3: 5 days ago (Snacks ₹2,000 paid by Host) -> Bucket 4-7
    const [exp3] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Mid Snacks',
      totalAmount: 200000,
      date: new Date(now - 5 * day),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp3 = processSplits('equal', 200000, [], allMembers.map(m => m.id));
    await db.insert(expenseSplits).values(sp3.map(s => ({ expenseId: exp3.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Exp 4: 1 day ago (Juice ₹800 paid by Host) -> Bucket 0-3
    const [exp4] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Recent Juice',
      totalAmount: 80000,
      date: new Date(now - 1 * day),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp4 = processSplits('equal', 80000, [], allMembers.map(m => m.id));
    await db.insert(expenseSplits).values(sp4.map(s => ({ expenseId: exp4.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Payment 1: F2 sends partial payment of ₹1,500 (Accepted)
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: f2.id,
      toPersonId: hostPerson.id,
      amount: 150000,
      date: new Date(now - 4 * day),
      status: 'accepted',
      mode: 'online',
      createdByType: 'host',
      decidedBy: host.id,
      decidedAt: new Date(now - 4 * day),
    });

    // Payment 2: F3 sends payment of ₹1,000 (Voided / is_deleted = true)
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: f3.id,
      toPersonId: hostPerson.id,
      amount: 100000,
      date: new Date(now - 3 * day),
      status: 'accepted',
      isDeleted: true,
      mode: 'online',
      createdByType: 'host',
      decidedBy: host.id,
      decidedAt: new Date(now - 3 * day),
    });

    const res = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Asia/Kolkata`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // Check aging bucket sum against sum of friends' remaining dues
    const bucketSum = data.aging.buckets.reduce((acc, b) => acc + b.amount, 0);
    const expectedRemaining = data.balances
      .filter(b => b.personId !== hostPerson.id)
      .reduce((acc, b) => acc + Math.max(0, -b.net), 0);

    expect(bucketSum).toBe(expectedRemaining);
    expect(data.collected.remaining).toBe(expectedRemaining);
  });

  // Test 3: Ring numbers match pace series final point and summary. Voided exclusion & un-void restoration.
  it('3. Ring numbers match pace final point and summary; pending/rejected do not increase collected; un-void restores', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Ring', username: 'host_ring', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Ring Group', user: host });
    const [friend] = await db.insert(people).values({ groupId: group.id, name: 'Friend Ring', isHost: false }).returning();

    // Expense ₹10,000
    const [exp] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Trek Gear',
      totalAmount: 1000000,
      date: new Date(Date.now() - 5 * 86400000),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp = processSplits('equal', 1000000, [], [hostPerson.id, friend.id]);
    await db.insert(expenseSplits).values(sp.map(s => ({ expenseId: exp.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Accepted payment ₹2,000
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friend.id,
      toPersonId: hostPerson.id,
      amount: 200000,
      status: 'accepted',
      mode: 'online',
      createdByType: 'host',
      decidedBy: host.id,
      decidedAt: new Date(),
    });

    // Pending payment ₹1,000 (must NOT increase collected)
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friend.id,
      toPersonId: hostPerson.id,
      amount: 100000,
      status: 'pending',
      mode: 'online',
      createdByType: 'friend',
    });

    // Rejected payment ₹500 (must NOT increase collected)
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friend.id,
      toPersonId: hostPerson.id,
      amount: 50000,
      status: 'rejected',
      mode: 'cash',
      createdByType: 'friend',
      decidedBy: host.id,
      decidedAt: new Date(),
    });

    // Voided payment ₹500
    const [voidedPmt] = await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friend.id,
      toPersonId: hostPerson.id,
      amount: 50000,
      status: 'accepted',
      isDeleted: true,
      mode: 'online',
      createdByType: 'host',
      decidedBy: host.id,
      decidedAt: new Date(),
    }).returning();

    const res1 = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Asia/Kolkata`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(res1.status).toBe(200);
    const data1 = res1.body.data;

    expect(data1.collected.collected).toBe(200000);
    expect(data1.summary.received).toBe(200000);
    expect(data1.pace[data1.pace.length - 1].collected).toBe(200000);
    expect(data1.pace[data1.pace.length - 1].totalOwed).toBe(data1.collected.totalOwed);

    // Now un-void the payment (restore it)
    await db.update(payments).set({ isDeleted: false }).where(eq(payments.id, voidedPmt.id));

    const res2 = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Asia/Kolkata`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    const data2 = res2.body.data;
    expect(data2.collected.collected).toBe(250000); // 200,000 + 50,000 restored
    expect(data2.summary.received).toBe(250000);
  });

  // Test 4: Day bucketing with timezone
  it('4. Day bucketing: payments at 23:30 IST and 00:30 IST land on different days, and invalid tz returns 400', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Tz', username: 'host_tz', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Tz Group', user: host });
    const [friend] = await db.insert(people).values({ groupId: group.id, name: 'Friend Tz', isHost: false }).returning();

    // 23:30 IST on Oct 10 is 18:00 UTC on Oct 10
    const d1 = new Date('2026-10-10T18:00:00Z');
    // 00:30 IST on Oct 11 is 19:00 UTC on Oct 10
    const d2 = new Date('2026-10-10T19:00:00Z');

    const [exp] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Tz Expense',
      totalAmount: 100000,
      date: new Date('2026-10-10T10:00:00Z'),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp = processSplits('equal', 100000, [], [hostPerson.id, friend.id]);
    await db.insert(expenseSplits).values(sp.map(s => ({ expenseId: exp.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    await db.insert(payments).values([
      {
        groupId: group.id,
        fromPersonId: friend.id,
        toPersonId: hostPerson.id,
        amount: 20000,
        date: d1,
        status: 'accepted',
        mode: 'online',
        createdByType: 'host',
        decidedBy: host.id,
        decidedAt: d1,
      },
      {
        groupId: group.id,
        fromPersonId: friend.id,
        toPersonId: hostPerson.id,
        amount: 30000,
        date: d2,
        status: 'accepted',
        mode: 'online',
        createdByType: 'host',
        decidedBy: host.id,
        decidedAt: d2,
      },
    ]);

    // Query in Asia/Kolkata
    const resIST = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Asia/Kolkata`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(resIST.status).toBe(200);

    // Invalid tz query
    const resBadTz = await request(app)
      .get(`/api/groups/${group.id}/analytics?tz=Invalid/Moon_Timezone`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(resBadTz.status).toBe(400);
    expect(resBadTz.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 5: Friend analytics strictly scoped, 403 on another person, public share link privacy
  it('5. Friend & Share-link analytics: scoped to verified person, 403 for unauthorized, zero exposure of other members data', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Host Priv', username: 'host_priv_an', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const [userAlice] = await db
      .insert(users)
      .values({ name: 'Alice User', username: 'alice_user', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const [userBob] = await db
      .insert(users)
      .values({ name: 'Bob User', username: 'bob_user', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Privacy Analytics Group', user: host });

    const rawToken = generateSecureToken();
    const [personAlice] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Alice',
        isHost: false,
        linkedUserId: userAlice.id,
        shareTokenHash: hashToken(rawToken),
        shareEnabled: true,
      })
      .returning();

    const [personBob] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Bob',
        isHost: false,
        linkedUserId: userBob.id,
      })
      .returning();

    // Exp 1: ₹6,000 paid by host, split between host, Alice, Bob (₹2,000 each)
    const [exp] = await db.insert(expenses).values({
      groupId: group.id,
      title: 'Shared Resort',
      totalAmount: 600000,
      date: new Date(),
      paidByPersonId: hostPerson.id,
      splitType: 'equal',
      createdBy: host.id,
    }).returning();
    const sp = processSplits('equal', 600000, [], [hostPerson.id, personAlice.id, personBob.id]);
    await db.insert(expenseSplits).values(sp.map(s => ({ expenseId: exp.id, groupId: group.id, personId: s.personId, amount: s.amount })));

    // Alice accesses her own analytics via /api/me/profiles/:personId/analytics
    const resAlice = await request(app)
      .get(`/api/me/profiles/${personAlice.id}/analytics`)
      .set('Authorization', `Bearer ${makeToken(userAlice)}`);

    expect(resAlice.status).toBe(200);
    const aliceData = resAlice.body.data;

    // Strict privacy assertion: EXACT top-level keys
    expect(Object.keys(aliceData).sort()).toEqual(['generatedAt', 'pendingMarkers', 'series', 'totals']);
    expect(aliceData.totals.share).toBe(200000);
    expect(aliceData.totals.left).toBe(200000);

    // Bob tries to access Alice's profile -> 403 Forbidden
    const resBobTriesAlice = await request(app)
      .get(`/api/me/profiles/${personAlice.id}/analytics`)
      .set('Authorization', `Bearer ${makeToken(userBob)}`);

    expect(resBobTriesAlice.status).toBe(403);
    expect(resBobTriesAlice.body.error.code).toBe('FORBIDDEN');

    // Public share link access via /api/s/:token/analytics
    const resShare = await request(app).get(`/api/s/${rawToken}/analytics`);
    expect(resShare.status).toBe(200);
    expect(Object.keys(resShare.body.data).sort()).toEqual(['generatedAt', 'pendingMarkers', 'series', 'totals']);

    // Invalid share token -> generic 404
    const resInvalidShare = await request(app).get('/api/s/invalidtokendummy123/analytics');
    expect(resInvalidShare.status).toBe(404);
    expect(resInvalidShare.body.error.code).toBe('STATEMENT_NOT_FOUND');
  });

  // Test 6: Permissions and admin analytics
  it('6. Host of another group gets 403; non-admin gets 403 on admin analytics; range caps enforced', async () => {
    const [host1] = await db.insert(users).values({ name: 'Host 1', username: 'h1_an', role: 'user', passwordHash: 'd', isActive: true }).returning();
    const [host2] = await db.insert(users).values({ name: 'Host 2', username: 'h2_an', role: 'user', passwordHash: 'd', isActive: true }).returning();
    const [adminUser] = await db.insert(users).values({ name: 'Admin', username: 'admin_an', role: 'admin', passwordHash: 'd', isActive: true }).returning();

    const { group: group1 } = await createGroupWithHost({ name: 'G1', user: host1 });

    // Host 2 tries to view Group 1 analytics -> 403
    const resH2 = await request(app)
      .get(`/api/groups/${group1.id}/analytics`)
      .set('Authorization', `Bearer ${makeToken(host2)}`);

    expect(resH2.status).toBe(403);
    expect(resH2.body.error.code).toBe('FORBIDDEN');

    // Admin can view Group 1 analytics -> 200
    const resAdminGroup = await request(app)
      .get(`/api/groups/${group1.id}/analytics`)
      .set('Authorization', `Bearer ${makeToken(adminUser)}`);

    expect(resAdminGroup.status).toBe(200);

    // Non-admin tries to view admin analytics -> 403
    const resNonAdminStats = await request(app)
      .get('/api/admin/analytics?days=14')
      .set('Authorization', `Bearer ${makeToken(host1)}`);

    expect(resNonAdminStats.status).toBe(403);

    // Admin views admin analytics -> 200
    const resAdminStats = await request(app)
      .get('/api/admin/analytics?days=14')
      .set('Authorization', `Bearer ${makeToken(adminUser)}`);

    expect(resAdminStats.status).toBe(200);
    expect(resAdminStats.body.data.signups.length).toBe(14);
    expect(resAdminStats.body.data.paymentsByStatus).toBeDefined();

    // Invalid days range -> 400
    const resBadDays = await request(app)
      .get('/api/admin/analytics?days=50')
      .set('Authorization', `Bearer ${makeToken(adminUser)}`);

    expect(resBadDays.status).toBe(400);
    expect(resBadDays.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 7: Empty group returns zeros and empty arrays
  it('7. Empty group and brand-new person return zeros and empty arrays, never errors', async () => {
    const [host] = await db
      .insert(users)
      .values({ name: 'Empty Host', username: 'empty_host', role: 'user', passwordHash: 'dummy', isActive: true })
      .returning();

    const { group } = await createGroupWithHost({ name: 'Empty Group', user: host });

    const res = await request(app)
      .get(`/api/groups/${group.id}/analytics`)
      .set('Authorization', `Bearer ${makeToken(host)}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.summary.totalSpent).toBe(0);
    expect(data.summary.received).toBe(0);
    expect(data.summary.stillOwed).toBe(0);
    expect(data.collected.totalOwed).toBe(0);
    expect(data.pace).toEqual([]);
    expect(data.aging.buckets.every(b => b.amount === 0 && b.people === 0)).toBe(true);
  });
});
