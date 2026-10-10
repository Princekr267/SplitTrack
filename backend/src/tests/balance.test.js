import { describe, it, expect } from 'vitest';
import { db } from '../config/db.js';
import { users, groups, people, expenses, expenseSplits, payments } from '../models/index.js';
import { calculateGroupBalances } from '../services/balanceService.js';
import { createGroupWithHost } from '../services/groupService.js';
import { calculateEqualSplits } from '../services/splitService.js';

describe('balanceService: Real PostgreSQL Balance & Invariant Tests', () => {
  it('computes accurate balances and satisfies sum-to-zero invariant', async () => {
    // 1. Create Host User
    const [hostUser] = await db
      .insert(users)
      .values({
        name: 'Arjun Host',
        username: 'arjun_host',
        email: 'arjun@splittrack.test',
        passwordHash: 'hash',
        role: 'user',
      })
      .returning();

    // 2. Create Group with Host Person
    const { group, hostPerson } = await createGroupWithHost({
      name: 'Goa Trip 2026',
      user: hostUser,
      ipAddress: '127.0.0.1',
    });

    // 3. Add 2 Friends
    const [friendA] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Rohan',
        isHost: false,
      })
      .returning();

    const [friendB] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Priya',
        isHost: false,
      })
      .returning();

    // 4. Host pays ₹300.00 (30000 paise) for dinner, split equally among all 3 (10000 paise each)
    const [exp1] = await db
      .insert(expenses)
      .values({
        groupId: group.id,
        title: 'Seafood Dinner',
        totalAmount: 30000,
        paidByPersonId: hostPerson.id,
        splitType: 'equal',
        createdBy: hostUser.id,
      })
      .returning();

    const splits1 = calculateEqualSplits(30000, [hostPerson.id, friendA.id, friendB.id]);
    await db.insert(expenseSplits).values(
      splits1.map((s) => ({
        expenseId: exp1.id,
        groupId: group.id,
        personId: s.personId,
        amount: s.amount,
      }))
    );

    // Initial check:
    // Host: paid 30000, share 10000 => net +20000 (Group owes host ₹200)
    // Rohan: paid 0, share 10000 => net -10000 (Owes ₹100)
    // Priya: paid 0, share 10000 => net -10000 (Owes ₹100)
    // Invariant sum: +20000 - 10000 - 10000 = 0
    let balanceData = await calculateGroupBalances(group.id);
    expect(balanceData.summary.netSumCheck).toBe(0);

    const hostBal = balanceData.people.find((p) => p.id === hostPerson.id);
    const rohanBal = balanceData.people.find((p) => p.id === friendA.id);
    const priyaBal = balanceData.people.find((p) => p.id === friendB.id);

    expect(hostBal.net).toBe(20000);
    expect(hostBal.groupOwesYou).toBe(20000);
    expect(hostBal.remainingToPay).toBe(0);

    expect(rohanBal.net).toBe(-10000);
    expect(rohanBal.remainingToPay).toBe(10000);

    expect(priyaBal.net).toBe(-10000);
    expect(priyaBal.remainingToPay).toBe(10000);

    // 5. Rohan pays ₹100.00 (10000 paise) to Host via online payment (accepted)
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friendA.id,
      toPersonId: hostPerson.id,
      amount: 10000,
      mode: 'online',
      status: 'accepted',
      createdByType: 'host',
      decidedBy: hostUser.id,
      decidedAt: new Date(),
    });

    balanceData = await calculateGroupBalances(group.id);
    expect(balanceData.summary.netSumCheck).toBe(0);

    const rohanBalAfterPay = balanceData.people.find((p) => p.id === friendA.id);
    expect(rohanBalAfterPay.net).toBe(0);
    expect(rohanBalAfterPay.remainingToPay).toBe(0);

    // 6. Priya submits a pending payment of ₹50.00
    // Assert pending payment does NOT alter Priya's official net balance
    await db.insert(payments).values({
      groupId: group.id,
      fromPersonId: friendB.id,
      toPersonId: hostPerson.id,
      amount: 5000,
      mode: 'online',
      status: 'pending',
      createdByType: 'friend',
    });

    balanceData = await calculateGroupBalances(group.id);
    const priyaBalPending = balanceData.people.find((p) => p.id === friendB.id);
    // Net should still be -10000 (pending does not affect net)
    expect(priyaBalPending.net).toBe(-10000);
    expect(priyaBalPending.pendingSentPaymentsTotal).toBe(5000);
    expect(balanceData.summary.totalPending).toBe(5000);
    expect(balanceData.summary.netSumCheck).toBe(0);
  });

  it('guarantees invariant sum(all nets) === 0 across randomized multi-person, multi-expense scenarios', async () => {
    // Setup group
    const [user] = await db
      .insert(users)
      .values({
        name: 'Test Host',
        username: 'test_rand',
        email: 'test_rand@splittrack.test',
        passwordHash: 'hash',
      })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({
      name: 'Stress Test Group',
      user,
    });

    // Add 4 friends
    const friendList = [];
    for (let i = 1; i <= 4; i++) {
      const [friend] = await db
        .insert(people)
        .values({
          groupId: group.id,
          name: `Friend ${i}`,
          isHost: false,
        })
        .returning();
      friendList.push(friend);
    }

    const allMembers = [hostPerson, ...friendList];

    // Create 15 randomized expenses and payments
    for (let e = 0; e < 15; e++) {
      const payer = allMembers[e % allMembers.length];
      const amount = (e + 1) * 1234 + 500; // arbitrary paise amount

      const [exp] = await db
        .insert(expenses)
        .values({
          groupId: group.id,
          title: `Random Expense ${e}`,
          totalAmount: amount,
          paidByPersonId: payer.id,
          splitType: 'equal',
          createdBy: user.id,
        })
        .returning();

      // Split equally among all 5 members
      const splits = calculateEqualSplits(
        amount,
        allMembers.map((m) => m.id)
      );
      await db.insert(expenseSplits).values(
        splits.map((s) => ({
          expenseId: exp.id,
          groupId: group.id,
          personId: s.personId,
          amount: s.amount,
        }))
      );
    }

    // Add 6 random accepted payments between different members
    for (let p = 0; p < 6; p++) {
      const fromP = allMembers[p % allMembers.length];
      const toP = allMembers[(p + 1) % allMembers.length];
      const payAmount = (p + 1) * 750;

      await db.insert(payments).values({
        groupId: group.id,
        fromPersonId: fromP.id,
        toPersonId: toP.id,
        amount: payAmount,
        mode: 'cash',
        status: 'accepted',
        createdByType: 'host',
        decidedBy: user.id,
      });
    }

    // Assert invariant
    const balanceData = await calculateGroupBalances(group.id);
    expect(balanceData.summary.netSumCheck).toBe(0);

    const sumNets = balanceData.people.reduce((acc, person) => acc + person.net, 0);
    expect(sumNets).toBe(0);
  });
});
