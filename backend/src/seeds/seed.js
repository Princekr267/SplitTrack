import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, pool } from '../config/db.js';
import { users, groups, people, expenses, expenseSplits, payments } from '../models/index.js';
import { createGroupWithHost } from '../services/groupService.js';
import { processSplits } from '../services/splitService.js';
import { calculateGroupBalances } from '../services/balanceService.js';
import { hashToken } from '../services/tokenService.js';

async function seed() {
  console.log('🌱 Starting SplitTrack seed script...');

  // Clean existing data
  await db.execute(sql`
    TRUNCATE TABLE 
      audit_logs, 
      payments, 
      expense_splits, 
      expenses, 
      people, 
      groups, 
      users 
    CASCADE;
  `);

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('adminpassword123', salt);
  const hostPasswordHash = await bcrypt.hash('hostpassword123', salt);
  const friendPasswordHash = await bcrypt.hash('friendpassword123', salt);

  // 1. Create Demo Admin
  const [admin] = await db
    .insert(users)
    .values({
      name: 'Platform Admin',
      email: 'admin@splittrack.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    })
    .returning();
  console.log('✅ Created Admin:', admin.email);

  // 2. Create Demo Host
  const [host] = await db
    .insert(users)
    .values({
      name: 'Vikram Host',
      email: 'host@splittrack.com',
      passwordHash: hostPasswordHash,
      role: 'user',
      isActive: true,
    })
    .returning();
  console.log('✅ Created Host:', host.email);

  // 3. Create Demo Friend User
  const [friendUser] = await db
    .insert(users)
    .values({
      name: 'Karan Patel',
      email: 'friend@splittrack.com',
      passwordHash: friendPasswordHash,
      role: 'user',
      isActive: true,
    })
    .returning();
  console.log('✅ Created Friend User:', friendUser.email);

  // 4. Create Demo Group with Host Person
  const { group, hostPerson } = await createGroupWithHost({
    name: 'Manali Road Trip 🏔️',
    date: new Date('2026-09-15T10:00:00Z'),
    description: '4-day road trip to Solang Valley and Old Manali with friends',
    user: host,
    ipAddress: '127.0.0.1',
  });
  console.log('✅ Created Group:', group.name, 'with Host Person:', hostPerson.name);

  // 5. Add 4 Friends (with demo link tokens and claimed account)
  const [aarav] = await db
    .insert(people)
    .values({
      groupId: group.id,
      name: 'Aarav Sharma',
      phone: '+91 98765 43210',
      note: 'Booked the SUV',
      isHost: false,
      shareTokenHash: hashToken('demo-share-token-aarav'),
      shareEnabled: true,
    })
    .returning();

  const [neha] = await db
    .insert(people)
    .values({
      groupId: group.id,
      name: 'Neha Verma',
      phone: '+91 98765 43211',
      note: 'Arranged photography',
      isHost: false,
      inviteCodeHash: hashToken('demo-invite-code-neha'),
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();

  const [karan] = await db
    .insert(people)
    .values({
      groupId: group.id,
      name: 'Karan Patel',
      phone: '+91 98765 43212',
      note: 'Managed snacks & music',
      isHost: false,
      linkedUserId: friendUser.id,
    })
    .returning();

  const [ananya] = await db
    .insert(people)
    .values({
      groupId: group.id,
      name: 'Ananya Iyer',
      phone: '+91 98765 43213',
      note: 'Campfire coordinator',
      isHost: false,
    })
    .returning();

  const friendPersons = [aarav, neha, karan, ananya];
  console.log(`✅ Added ${friendPersons.length} friends to group (Karan claimed, Aarav shared, Neha invited)`);

  const allMembers = [hostPerson, ...friendPersons];

  // 5. Add Expense 1: Equal Split (SUV Rental - ₹12,000 / 1200000 paise, paid by Vikram)
  const [exp1] = await db
    .insert(expenses)
    .values({
      groupId: group.id,
      title: 'SUV Car Rental & Fuel 🚙',
      totalAmount: 1200000,
      date: new Date('2026-09-15T14:30:00Z'),
      paidByPersonId: hostPerson.id,
      description: 'Toyota Fortuner rental for 4 days including highway toll charges',
      splitType: 'equal',
      createdBy: host.id,
    })
    .returning();

  const splits1 = processSplits('equal', 1200000, [], allMembers.map((m) => m.id));
  await db.insert(expenseSplits).values(
    splits1.map((s) => ({
      expenseId: exp1.id,
      groupId: group.id,
      personId: s.personId,
      amount: s.amount,
    }))
  );
  console.log('✅ Added Equal Split Expense: ₹12,000 (SUV Rental)');

  // 6. Add Expense 2: Exact Split (Riverside Cafe Dinner - ₹5,450 / 545000 paise, paid by Aarav)
  const exactSplitsInput = [
    { personId: hostPerson.id, amount: 110000 }, // ₹1,100
    { personId: friendPersons[0].id, amount: 120000 }, // ₹1,200 (Aarav)
    { personId: friendPersons[1].id, amount: 95000 }, // ₹950 (Neha)
    { personId: friendPersons[2].id, amount: 120000 }, // ₹1,200 (Karan)
    { personId: friendPersons[3].id, amount: 100000 }, // ₹1,000 (Ananya)
  ];

  const [exp2] = await db
    .insert(expenses)
    .values({
      groupId: group.id,
      title: 'Riverside Cafe Dinner 🍲',
      totalAmount: 545000,
      date: new Date('2026-09-16T20:15:00Z'),
      paidByPersonId: friendPersons[0].id, // Aarav paid
      description: 'Trout fish, pasta, hot chocolate and desserts by the river',
      splitType: 'exact',
      createdBy: host.id,
    })
    .returning();

  const splits2 = processSplits('exact', 545000, exactSplitsInput);
  await db.insert(expenseSplits).values(
    splits2.map((s) => ({
      expenseId: exp2.id,
      groupId: group.id,
      personId: s.personId,
      amount: s.amount,
      exactAmount: s.exactAmount,
    }))
  );
  console.log('✅ Added Exact Split Expense: ₹5,450 (Riverside Cafe)');

  // 7. Add Expense 3: Percentage Split (Cottage Booking - ₹20,000 / 2000000 paise, paid by Vikram)
  const percentageSplitsInput = [
    { personId: hostPerson.id, basisPoints: 2000 }, // 20.00%
    { personId: friendPersons[0].id, basisPoints: 2000 }, // 20.00%
    { personId: friendPersons[1].id, basisPoints: 2000 }, // 20.00%
    { personId: friendPersons[2].id, basisPoints: 2000 }, // 20.00%
    { personId: friendPersons[3].id, basisPoints: 2000 }, // 20.00%
  ];

  const [exp3] = await db
    .insert(expenses)
    .values({
      groupId: group.id,
      title: 'Pine Forest Cottage Booking 🏡',
      totalAmount: 2000000,
      date: new Date('2026-09-15T11:00:00Z'),
      paidByPersonId: hostPerson.id,
      description: 'Wooden cottage for 3 nights with mountain view',
      splitType: 'percentage',
      createdBy: host.id,
    })
    .returning();

  const splits3 = processSplits('percentage', 2000000, percentageSplitsInput);
  await db.insert(expenseSplits).values(
    splits3.map((s) => ({
      expenseId: exp3.id,
      groupId: group.id,
      personId: s.personId,
      amount: s.amount,
      basisPoints: s.basisPoints,
    }))
  );
  console.log('✅ Added Percentage Split Expense: ₹20,000 (Cottage)');

  // 8. Add Payments in all statuses
  // Payment 1: Accepted (Neha Verma -> Vikram Host ₹3,000 / 300000 paise)
  await db.insert(payments).values({
    groupId: group.id,
    fromPersonId: friendPersons[1].id,
    toPersonId: hostPerson.id,
    amount: 300000,
    date: new Date('2026-09-17T15:00:00Z'),
    mode: 'online',
    description: 'Partial advance repayment via Google Pay',
    reference: 'UPI/MANALI/298341908',
    status: 'accepted',
    createdByType: 'host',
    decidedBy: host.id,
    decidedAt: new Date('2026-09-17T15:05:00Z'),
  });
  console.log('✅ Added Accepted Payment: ₹3,000 (Neha -> Vikram)');

  // Payment 2: Pending (Karan Patel -> Vikram Host ₹2,500 / 250000 paise)
  await db.insert(payments).values({
    groupId: group.id,
    fromPersonId: friendPersons[2].id,
    toPersonId: hostPerson.id,
    amount: 250000,
    date: new Date('2026-09-18T09:30:00Z'),
    mode: 'online',
    description: 'Repayment for cottage and dinner via PhonePe',
    reference: 'UPI/KARAN/891237190',
    status: 'pending',
    createdByType: 'friend',
  });
  console.log('✅ Added Pending Payment: ₹2,500 (Karan -> Vikram)');

  // Payment 3: Rejected (Ananya Iyer -> Vikram Host ₹1,500 / 150000 paise)
  await db.insert(payments).values({
    groupId: group.id,
    fromPersonId: friendPersons[3].id,
    toPersonId: hostPerson.id,
    amount: 150000,
    date: new Date('2026-09-18T12:00:00Z'),
    mode: 'cash',
    description: 'Handed over cash during cafe checkout',
    status: 'rejected',
    rejectReason: 'Cash was mistakenly given to driver, not received by host.',
    createdByType: 'friend',
    decidedBy: host.id,
    decidedAt: new Date('2026-09-18T13:00:00Z'),
  });
  console.log('✅ Added Rejected Payment: ₹1,500 (Ananya -> Vikram)');

  // 9. Verify balances
  const balances = await calculateGroupBalances(group.id);
  console.log('\n📊 Group Summary:');
  console.log(`   Total Spent: ₹${(balances.summary.totalSpent / 100).toFixed(2)}`);
  console.log(`   Total Received: ₹${(balances.summary.totalReceived / 100).toFixed(2)}`);
  console.log(`   Total Pending: ₹${(balances.summary.totalPending / 100).toFixed(2)}`);
  console.log(`   Net Sum Invariant: ${balances.summary.netSumCheck} (Expected: 0)`);

  console.log('\n👥 Per-Person Balances:');
  for (const p of balances.people) {
    const roleTag = p.isHost ? '[HOST]' : '[FRIEND]';
    const statusText =
      p.net > 0
        ? `Group owes ₹${(p.groupOwesYou / 100).toFixed(2)}`
        : p.net < 0
        ? `Owes ₹${(p.remainingToPay / 100).toFixed(2)}`
        : 'Settled (₹0)';
    console.log(`   ${roleTag} ${p.name.padEnd(16)}: ${statusText}`);
  }

  console.log('\n✨ SplitTrack database successfully seeded with demo data!\n');
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seeding failed:', err);
    await pool.end();
    process.exit(1);
  });
