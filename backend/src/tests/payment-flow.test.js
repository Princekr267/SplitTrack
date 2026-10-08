import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, groups, people, expenses, expenseSplits } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { calculateEqualSplits } from '../services/splitService.js';
import { calculateGroupBalances } from '../services/balanceService.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

describe('paymentFlow: Friend Submission, Host Inbox (Accept/Reject), & Resubmission Lifecycle', () => {
  it('manages full payment lifecycle: submit (pending) -> reject with reason -> edit & resubmit -> accept', async () => {
    // 1. Host creates group
    const [host] = await db
      .insert(users)
      .values({ name: 'Vikram Host', email: 'host_flow@test.com', passwordHash: 'hash' })
      .returning();

    const { group, hostPerson } = await createGroupWithHost({ name: 'Road Trip', user: host });

    // 2. Friend account registered and linked to profile
    const [friendUser] = await db
      .insert(users)
      .values({ name: 'Karan Friend', email: 'karan_flow@test.com', passwordHash: 'hash' })
      .returning();

    const [friendPerson] = await db
      .insert(people)
      .values({
        groupId: group.id,
        name: 'Karan Patel',
        linkedUserId: friendUser.id,
        isHost: false,
      })
      .returning();

    // 3. Host pays ₹200.00 (20000 paise) split equally between Host and Karan (₹100 each)
    const [exp] = await db
      .insert(expenses)
      .values({
        groupId: group.id,
        title: 'Highway Toll & Fuel',
        totalAmount: 20000,
        paidByPersonId: hostPerson.id,
        createdBy: host.id,
      })
      .returning();

    const splits = calculateEqualSplits(20000, [hostPerson.id, friendPerson.id]);
    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        expenseId: exp.id,
        groupId: group.id,
        personId: s.personId,
        amount: s.amount,
      }))
    );

    // Initial check: Karan owes ₹100.00 (10000 paise)
    let balances = await calculateGroupBalances(group.id);
    let karanBal = balances.people.find((p) => p.id === friendPerson.id);
    expect(karanBal.remainingToPay).toBe(10000);

    const friendToken = jwt.sign({ userId: friendUser.id }, env.JWT_SECRET);
    const hostToken = jwt.sign({ userId: host.id }, env.JWT_SECRET);

    // 4. Friend submits a payment of ₹100.00 (10000 paise)
    const submitRes = await request(app)
      .post('/api/friend/payments')
      .set('Cookie', [`splittrack_token=${friendToken}`])
      .send({
        groupId: group.id,
        amount: 10000,
        mode: 'online',
        reference: 'UPI/98129038',
        description: 'Settled via Google Pay',
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('pending');
    const paymentId = submitRes.body.data.id;

    // Check: balance must STILL be 10000 paise because payment is pending!
    balances = await calculateGroupBalances(group.id);
    karanBal = balances.people.find((p) => p.id === friendPerson.id);
    expect(karanBal.remainingToPay).toBe(10000);
    expect(balances.summary.totalPending).toBe(10000);

    // 5. Host views pending payments inbox
    const pendingRes = await request(app)
      .get(`/api/groups/${group.id}/payments/pending`)
      .set('Cookie', [`splittrack_token=${hostToken}`]);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data).toHaveLength(1);
    expect(pendingRes.body.data[0].id).toBe(paymentId);

    // 6. Host rejects payment (requires reason)
    const rejectWithoutReason = await request(app)
      .post(`/api/groups/${group.id}/payments/${paymentId}/reject`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({});
    expect(rejectWithoutReason.status).toBe(400);

    const rejectRes = await request(app)
      .post(`/api/groups/${group.id}/payments/${paymentId}/reject`)
      .set('Cookie', [`splittrack_token=${hostToken}`])
      .send({ reason: 'UPI reference not found in bank statement' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('rejected');
    expect(rejectRes.body.data.rejectReason).toBe('UPI reference not found in bank statement');

    // 7. Friend edits and resubmits the rejected payment
    const resubmitRes = await request(app)
      .patch(`/api/friend/payments/${paymentId}`)
      .set('Cookie', [`splittrack_token=${friendToken}`])
      .send({
        groupId: group.id,
        reference: 'UPI/CORRECT_REF_99999',
        description: 'Resubmitted with correct transaction reference',
      });

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe('pending');
    expect(resubmitRes.body.data.rejectReason).toBe('');

    // 8. Host accepts the resubmitted payment
    const acceptRes = await request(app)
      .post(`/api/groups/${group.id}/payments/${paymentId}/accept`)
      .set('Cookie', [`splittrack_token=${hostToken}`]);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('accepted');

    // 9. Balance now immediately updates: Karan is fully settled (₹0)!
    balances = await calculateGroupBalances(group.id);
    karanBal = balances.people.find((p) => p.id === friendPerson.id);
    expect(karanBal.remainingToPay).toBe(0);
    expect(karanBal.net).toBe(0);
    expect(balances.summary.isSettledReady).toBe(true);
    expect(balances.summary.netSumCheck).toBe(0);
  });
});
