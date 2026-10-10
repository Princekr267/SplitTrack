import React from 'react';
import {
  ChartCard,
  RingChart,
  AreaLineChart,
} from './index.js';
import { formatFullINR, formatCompactINR } from '../../utils/chartMath.js';
import { CheckCircle2 } from 'lucide-react';

/**
 * Friend Statement Visualizations Component.
 * Used on both the logged-in Friend Dashboard and the public Share Link (/s/:token).
 * Displays own data only:
 * 1. "Your dues over time" area chart with hollow pending payment markers
 * 2. "Paid / pending / left" ring with accessible legend
 *
 * @param {object} analytics - Payload with { totals: { share, paid, pending, left }, series, pendingMarkers }
 * @param {boolean} loading
 * @param {string|null} error
 * @param {function} onRetry
 */
export function FriendStatementCharts({
  analytics,
  loading = false,
  error = null,
  onRetry,
}) {
  if (loading && !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse select-none">
        <div className="h-64 rounded-2xl bg-surface-raised border border-border" />
        <div className="h-64 rounded-2xl bg-surface-raised border border-border" />
      </div>
    );
  }

  const totals = analytics?.totals || { share: 0, paid: 0, pending: 0, left: 0 };
  const series = analytics?.series || [];
  const pendingMarkers = analytics?.pendingMarkers || [];

  const ringTotal = totals.share > 0 ? totals.share : totals.paid + totals.pending + totals.left;

  const ringSegments = [
    {
      key: 'paid',
      label: 'Paid & Approved',
      value: totals.paid,
      color: 'var(--chart-owed)',
    },
    {
      key: 'pending',
      label: 'Pending Approval (not counted yet)',
      value: totals.pending,
      color: 'var(--chart-pending)',
      hatch: true,
    },
    {
      key: 'left',
      label: 'Remaining Left to Pay',
      value: totals.left,
      color: 'var(--chart-track)',
    },
  ];

  const isSettled = totals.left === 0 && totals.pending === 0 && totals.paid > 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Your dues over time */}
        <ChartCard
          title="Your Dues Over Time"
          subtitle="Remaining balance after each expense share and accepted repayment"
          error={error}
          onRetry={onRetry}
          empty={series.length === 0}
          emptyMessage="No transaction history to plot yet."
          tableData={{
            caption: 'Remaining dues trajectory',
            headers: ['Date', 'Event Description', 'Remaining Due'],
            rows: series.map((s) => [
              s.date,
              s.label || s.kind,
              formatFullINR(s.remaining, true),
            ]),
          }}
          legend={
            pendingMarkers.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-warning bg-surface inline-block" />
                <span>Pending payment marker</span>
              </div>
            )
          }
        >
          <AreaLineChart
            series={series}
            pendingMarkers={pendingMarkers}
            height={210}
            color="var(--chart-primary)"
          />
        </ChartCard>

        {/* Chart 2: Paid / Pending / Left Ring */}
        <ChartCard
          title="Repayment Progress"
          subtitle={
            isSettled
              ? 'You have fully paid your share'
              : `${formatFullINR(totals.paid, true)} paid of ${formatFullINR(ringTotal, true)} total share`
          }
          error={error}
          onRetry={onRetry}
          empty={ringTotal === 0}
          emptyMessage="No costs recorded for your profile yet."
          tableData={{
            caption: 'Repayment breakdown',
            headers: ['Category', 'Amount'],
            rows: ringSegments.map((s) => [s.label, formatFullINR(s.value, true)]),
          }}
          legend={
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                <span className="text-text-muted">Paid:</span>
                <span className="font-mono font-medium text-text">
                  {formatCompactINR(totals.paid, true)}
                </span>
              </div>

              {totals.pending > 0 && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-warning"
                    style={{
                      background: 'repeating-linear-gradient(45deg, var(--chart-pending), var(--chart-pending) 2px, transparent 2px, transparent 4px)',
                    }}
                  />
                  <span className="text-text-muted">Pending approval (not counted yet):</span>
                  <span className="font-mono font-medium text-text">
                    {formatCompactINR(totals.pending, true)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
                <span className="text-text-muted">Left to pay:</span>
                <span className="font-mono font-medium text-text">
                  {formatCompactINR(totals.left, true)}
                </span>
              </div>
            </div>
          }
        >
          {isSettled ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-xl font-black text-text font-mono">100%</span>
              <span className="text-xs font-semibold text-success">
                All your dues are fully settled!
              </span>
            </div>
          ) : (
            <RingChart
              segments={ringSegments}
              total={ringTotal}
              size={200}
              strokeWidth={20}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default FriendStatementCharts;
