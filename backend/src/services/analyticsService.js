import { eq, and, sql, asc, inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { groups, people, expenses, expenseSplits, payments, users } from '../models/index.js';
import { calculateGroupBalances } from './balanceService.js';

/**
 * Format a Date object into YYYY-MM-DD in the specified IANA timezone.
 */
export function formatDateInTz(date, tz = 'Asia/Kolkata') {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Calculate difference in calendar days (date2 - date1) from 'YYYY-MM-DD' strings.
 */
export function diffCalendarDays(earlierDateStr, laterDateStr) {
  const [y1, m1, d1] = earlierDateStr.split('-').map(Number);
  const [y2, m2, d2] = laterDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Downsamples an array to at most maxPoints, preserving first, last, and evenly spaced items.
 */
export function downsampleSeries(items, maxPoints = 60) {
  if (!items || items.length <= maxPoints) return items || [];
  const result = [];
  const total = items.length;
  const step = (total - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(total - 1, Math.round(i * step));
    result.push(items[idx]);
  }
  return result;
}

/**
 * Computes host dashboard analytics payload for a group.
 * @param {string} groupId
 * @param {string} [tz='Asia/Kolkata']
 */
export async function getGroupAnalytics(groupId, tz = 'Asia/Kolkata') {
  // 1. Calculate ground-truth balances using balanceService
  const bal = await calculateGroupBalances(groupId);
  const now = new Date();
  const todayStr = formatDateInTz(now, tz);

  // 2. Query all non-deleted expenses with their splits
  const allExpenses = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      totalAmount: expenses.totalAmount,
      date: expenses.date,
      paidByPersonId: expenses.paidByPersonId,
    })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isDeleted, false)))
    .orderBy(asc(expenses.date), asc(expenses.id));

  const allSplits = allExpenses.length > 0
    ? await db
        .select({
          expenseId: expenseSplits.expenseId,
          personId: expenseSplits.personId,
          amount: expenseSplits.amount,
        })
        .from(expenseSplits)
        .where(eq(expenseSplits.groupId, groupId))
    : [];

  const splitsByExpenseId = new Map();
  for (const s of allSplits) {
    if (!splitsByExpenseId.has(s.expenseId)) {
      splitsByExpenseId.set(s.expenseId, []);
    }
    splitsByExpenseId.get(s.expenseId).push(s);
  }

  // 3. Query all non-deleted payments
  const allPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      date: payments.date,
      mode: payments.mode,
      status: payments.status,
      fromPersonId: payments.fromPersonId,
      toPersonId: payments.toPersonId,
      isDeleted: payments.isDeleted,
    })
    .from(payments)
    .where(and(eq(payments.groupId, groupId), eq(payments.isDeleted, false)))
    .orderBy(asc(payments.date), asc(payments.id));

  const acceptedPayments = allPayments.filter((p) => p.status === 'accepted');

  // Handle empty groups
  if (bal.people.length === 0 || allExpenses.length === 0) {
    return {
      summary: {
        totalSpent: bal.summary?.totalSpent || 0,
        received: bal.summary?.totalReceived || 0,
        pending: bal.summary?.totalPending || 0,
        stillOwed: 0,
      },
      balances: bal.people.map((p) => ({
        personId: p.id,
        name: p.name,
        username: p.username || null,
        net: 0,
        sparkline: [0],
        ...(p.isDeleted ? { isRemoved: true } : {}),
      })),
      collected: {
        collected: 0,
        pending: 0,
        remaining: 0,
        totalOwed: 0,
      },
      pace: [],
      modes: {
        cash: { amount: 0, count: 0 },
        online: { amount: 0, count: 0 },
      },
      aging: {
        buckets: [
          { key: '0-3', amount: 0, people: 0 },
          { key: '4-7', amount: 0, people: 0 },
          { key: '8-14', amount: 0, people: 0 },
          { key: '15+', amount: 0, people: 0 },
        ],
      },
      generatedAt: now.toISOString(),
    };
  }

  // 4. Compute sparklines step-by-step across all chronological events
  // Events: expenses and accepted payments
  const chronologicalEvents = [
    ...allExpenses.map((e) => ({
      type: 'expense',
      date: e.date,
      id: e.id,
      totalAmount: e.totalAmount,
      paidByPersonId: e.paidByPersonId,
    })),
    ...acceptedPayments.map((p) => ({
      type: 'payment',
      date: p.date,
      id: p.id,
      amount: p.amount,
      fromPersonId: p.fromPersonId,
      toPersonId: p.toPersonId,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const personIds = bal.people.map((p) => p.id);
  const personSparklines = new Map(personIds.map((id) => [id, [0]]));
  const simLedger = new Map(
    personIds.map((id) => [id, { paid: 0, splits: 0, sent: 0, received: 0 }])
  );

  for (const ev of chronologicalEvents) {
    if (ev.type === 'expense') {
      const payer = simLedger.get(ev.paidByPersonId);
      if (payer) payer.paid += ev.totalAmount;
      const sps = splitsByExpenseId.get(ev.id) || [];
      for (const s of sps) {
        const mem = simLedger.get(s.personId);
        if (mem) mem.splits += s.amount;
      }
    } else if (ev.type === 'payment') {
      const fromMem = simLedger.get(ev.fromPersonId);
      const toMem = simLedger.get(ev.toPersonId);
      if (fromMem) fromMem.sent += ev.amount;
      if (toMem) toMem.received += ev.amount;
    }

    for (const pid of personIds) {
      const st = simLedger.get(pid);
      const netAtMoment = st.paid - st.splits + st.sent - st.received;
      // sparkline represents remaining due over time: -net (positive means owes, normalize 0)
      const due = netAtMoment === 0 ? 0 : -netAtMoment;
      personSparklines.get(pid).push(due);
    }

  }

  // Downsample sparklines if they exceed 20 points
  const sparklineMap = new Map();
  for (const [pid, points] of personSparklines.entries()) {
    sparklineMap.set(pid, downsampleSeries(points, 20));
  }

  // 5. FIFO Aging Engine
  const agingBuckets = {
    '0-3': { amount: 0, people: new Set() },
    '4-7': { amount: 0, people: new Set() },
    '8-14': { amount: 0, people: new Set() },
    '15+': { amount: 0, people: new Set() },
  };

  for (const p of bal.people) {
    if (p.isHost || p.net >= 0) continue;

    // Credit = (other people's shares on expenses this person fronted) + accepted payments sent - accepted payments received
    let frontedOthers = 0;
    for (const e of allExpenses) {
      if (e.paidByPersonId === p.id) {
        const sps = splitsByExpenseId.get(e.id) || [];
        for (const s of sps) {
          if (s.personId !== p.id) {
            frontedOthers += s.amount;
          }
        }
      }
    }

    let credit = frontedOthers + p.acceptedSentPaymentsTotal - p.acceptedReceivedPaymentsTotal;

    // Collect and sort non-self-share splits chronologically
    const friendSplits = [];
    for (const e of allExpenses) {
      if (e.paidByPersonId === p.id) continue; // Exclude payer self-shares
      const sps = splitsByExpenseId.get(e.id) || [];
      const splitRow = sps.find((s) => s.personId === p.id);
      if (splitRow) {
        friendSplits.push({ date: e.date, amount: splitRow.amount });
      }
    }
    friendSplits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const s of friendSplits) {
      if (credit >= s.amount) {
        credit -= s.amount;
      } else {
        const unpaid = s.amount - credit;
        credit = 0;
        const expenseDayStr = formatDateInTz(s.date, tz);
        const diffDays = diffCalendarDays(expenseDayStr, todayStr);

        let bucketKey = '15+';
        if (diffDays <= 3) bucketKey = '0-3'; // Future-dated clamped to '0-3' as diffDays <= 3
        else if (diffDays <= 7) bucketKey = '4-7';
        else if (diffDays <= 14) bucketKey = '8-14';

        agingBuckets[bucketKey].amount += unpaid;
        agingBuckets[bucketKey].people.add(p.id);
      }
    }
  }

  // 6. Balances output
  const balancesOut = bal.people
    .map((p) => ({
      personId: p.id,
      name: p.name,
      username: p.username || null,
      net: p.net,
      sparkline: sparklineMap.get(p.id) || [0],
      ...(p.isDeleted ? { isRemoved: true } : {}),
    }))
    .sort((a, b) => a.net - b.net); // Most owing first (lowest net)

  // 7. Collected summary & ring numbers
  const friendsRemaining = bal.people
    .filter((p) => !p.isHost)
    .reduce((acc, p) => acc + Math.max(0, -p.net), 0);

  const collected = bal.summary.totalReceived;
  const pending = Math.min(bal.summary.totalPending, friendsRemaining); // Capped at remaining
  const totalOwed = collected + friendsRemaining;

  // 8. Repayment pace curve (cumulative by day from first expense to today)
  const firstExpenseDate = allExpenses[0].date;
  const firstDayStr = formatDateInTz(firstExpenseDate, tz);
  const totalCalendarDays = Math.min(366, Math.max(0, diffCalendarDays(firstDayStr, todayStr)));

  // Generate day strings
  const [startY, startM, startD] = firstDayStr.split('-').map(Number);
  const dailyPoints = [];

  for (let dayOffset = 0; dayOffset <= totalCalendarDays; dayOffset++) {
    const curDate = new Date(Date.UTC(startY, startM - 1, startD + dayOffset));
    const dayStr = curDate.toISOString().split('T')[0];

    // Cumulative accepted payments from friends up to end of this day in tz
    // A record belongs to dayStr or earlier if formatDateInTz(record.date, tz) <= dayStr
    let dayCollected = 0;
    for (const p of acceptedPayments) {
      if (formatDateInTz(p.date, tz) <= dayStr) {
        dayCollected += p.amount;
      }
    }

    // Cumulative total owed up to this day:
    // Sum of non-host shares incurred up to this day minus friend-fronted credits for others up to this day
    let dayFriendsShares = 0;
    let dayFriendCredits = 0;
    for (const e of allExpenses) {
      if (formatDateInTz(e.date, tz) <= dayStr) {
        const sps = splitsByExpenseId.get(e.id) || [];
        const isHostPayer = bal.people.find((p) => p.id === e.paidByPersonId)?.isHost;
        for (const s of sps) {
          const person = bal.people.find((p) => p.id === s.personId);
          if (person && !person.isHost) {
            dayFriendsShares += s.amount;
          }
        }
        if (!isHostPayer) {
          // Friend fronted: their credit for others reduces group-level net debt
          for (const s of sps) {
            if (s.personId !== e.paidByPersonId) {
              dayFriendCredits += s.amount;
            }
          }
        }
      }
    }

    const dayTotalOwed = Math.max(0, dayFriendsShares - dayFriendCredits);
    dailyPoints.push({
      date: dayStr,
      collected: dayCollected,
      totalOwed: dayTotalOwed,
    });
  }

  // Ensure last point matches today and exactly equals final numbers
  if (dailyPoints.length > 0) {
    const last = dailyPoints[dailyPoints.length - 1];
    last.date = todayStr;
    last.collected = collected;
    last.totalOwed = totalOwed;
  }

  const paceSeries = downsampleSeries(dailyPoints, 60);

  // 9. Payment modes
  const modes = {
    cash: { amount: 0, count: 0 },
    online: { amount: 0, count: 0 },
  };
  for (const p of acceptedPayments) {
    if (p.mode === 'cash') {
      modes.cash.amount += p.amount;
      modes.cash.count += 1;
    } else if (p.mode === 'online') {
      modes.online.amount += p.amount;
      modes.online.count += 1;
    }
  }

  return {
    summary: {
      totalSpent: bal.summary.totalSpent,
      received: bal.summary.totalReceived,
      pending: bal.summary.totalPending,
      stillOwed: friendsRemaining,
    },
    balances: balancesOut,
    collected: {
      collected,
      pending,
      remaining: friendsRemaining,
      totalOwed,
    },
    pace: paceSeries,
    modes,
    aging: {
      buckets: [
        { key: '0-3', amount: agingBuckets['0-3'].amount, people: agingBuckets['0-3'].people.size },
        { key: '4-7', amount: agingBuckets['4-7'].amount, people: agingBuckets['4-7'].people.size },
        { key: '8-14', amount: agingBuckets['8-14'].amount, people: agingBuckets['8-14'].people.size },
        { key: '15+', amount: agingBuckets['15+'].amount, people: agingBuckets['15+'].people.size },
      ],
    },
    generatedAt: now.toISOString(),
  };
}

/**
 * Computes individual friend statement analytics (strictly own data only).
 * @param {string} personId
 * @param {string} groupId
 * @param {string} [tz='Asia/Kolkata']
 */
export async function getPersonAnalytics(personId, groupId, tz = 'Asia/Kolkata') {
  const now = new Date();

  // 1. Fetch non-deleted expense splits for this person
  const mySplits = await db
    .select({
      expenseId: expenseSplits.expenseId,
      amount: expenseSplits.amount,
      title: expenses.title,
      date: expenses.date,
      paidByPersonId: expenses.paidByPersonId,
    })
    .from(expenseSplits)
    .innerJoin(
      expenses,
      and(
        eq(expenseSplits.expenseId, expenses.id),
        eq(expenses.groupId, groupId),
        eq(expenses.isDeleted, false)
      )
    )
    .where(and(eq(expenseSplits.groupId, groupId), eq(expenseSplits.personId, personId)))
    .orderBy(asc(expenses.date), asc(expenses.id));

  // 2. Fetch payments involving this person
  const myPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      date: payments.date,
      status: payments.status,
      description: payments.description,
      fromPersonId: payments.fromPersonId,
      toPersonId: payments.toPersonId,
    })
    .from(payments)
    .where(
      and(
        eq(payments.groupId, groupId),
        eq(payments.isDeleted, false),
        eq(payments.fromPersonId, personId)
      )
    )
    .orderBy(asc(payments.date), asc(payments.id));

  // Fetch expenses fronted by this person to count credit
  const frontedExpenses = await db
    .select({
      id: expenses.id,
      totalAmount: expenses.totalAmount,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        eq(expenses.paidByPersonId, personId),
        eq(expenses.isDeleted, false)
      )
    );

  // 3. Build chronological step-by-step series of remaining dues
  const chronologicalItems = [];

  for (const s of mySplits) {
    chronologicalItems.push({
      date: s.date,
      type: 'expense',
      label: s.title,
      amount: s.amount,
    });
  }

  const pendingMarkers = [];
  let totalPaid = 0;
  let totalPending = 0;

  for (const p of myPayments) {
    if (p.status === 'accepted') {
      totalPaid += p.amount;
      chronologicalItems.push({
        date: p.date,
        type: 'payment',
        label: p.description || 'Payment',
        amount: p.amount,
      });
    } else if (p.status === 'pending') {
      totalPending += p.amount;
      pendingMarkers.push({
        date: formatDateInTz(p.date, tz),
        amount: p.amount,
      });
    }
  }

  chronologicalItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningDue = 0;
  const series = [];

  for (const item of chronologicalItems) {
    if (item.type === 'expense') {
      runningDue += item.amount;
    } else if (item.type === 'payment') {
      runningDue = Math.max(0, runningDue - item.amount);
    }

    series.push({
      date: formatDateInTz(item.date, tz),
      label: item.label,
      kind: item.type,
      remaining: runningDue,
    });
  }

  const cappedSeries = downsampleSeries(series, 200);
  const totalShare = mySplits.reduce((acc, s) => acc + s.amount, 0);

  return {
    totals: {
      share: totalShare,
      paid: totalPaid,
      pending: totalPending,
      left: runningDue,
    },
    series: cappedSeries,
    pendingMarkers,
    generatedAt: now.toISOString(),
  };
}

// In-memory cache for admin analytics (60 seconds)
const adminAnalyticsCache = new Map();

/**
 * Computes Admin overview analytics.
 * @param {number|string} days - 14, 30, or 90
 */
export async function getAdminAnalytics(days = 14) {
  const numDays = Number(days) || 14;
  const cacheKey = `admin_analytics_${numDays}`;
  const cached = adminAnalyticsCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 1. Signups per day using generate_series
  const signupsRaw = await db.execute(sql`
    WITH date_range AS (
      SELECT (current_date - (n || ' days')::interval)::date AS day
      FROM generate_series(0, ${numDays - 1}) AS n
    )
    SELECT 
      dr.day::text AS date,
      COALESCE(COUNT(u.id), 0)::int AS count
    FROM date_range dr
    LEFT JOIN users u ON date_trunc('day', u.created_at AT TIME ZONE 'UTC') = dr.day
    GROUP BY dr.day
    ORDER BY dr.day ASC
  `);

  const signups = (signupsRaw.rows || []).map((r) => ({
    date: r.date,
    count: Number(r.count) || 0,
  }));

  // 2. Payments by status (accepted, pending, rejected, voided)
  const paymentsAgg = await db.execute(sql`
    SELECT
      CASE 
        WHEN is_deleted = true THEN 'voided'
        ELSE status::text
      END AS status_bucket,
      COUNT(*)::int AS count,
      COALESCE(SUM(amount), 0)::text AS amount
    FROM payments
    GROUP BY status_bucket
  `);

  const statusMap = {
    accepted: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    voided: { count: 0, amount: 0 },
  };

  for (const row of paymentsAgg.rows || []) {
    const bucket = row.status_bucket;
    if (statusMap[bucket]) {
      statusMap[bucket].count = Number(row.count) || 0;
      statusMap[bucket].amount = Number(row.amount) || 0;
    }
  }

  const payload = {
    signups,
    paymentsByStatus: statusMap,
    generatedAt: new Date().toISOString(),
  };

  adminAnalyticsCache.set(cacheKey, {
    data: payload,
    expiresAt: Date.now() + 60 * 1000, // 60s TTL
  });

  return payload;
}
