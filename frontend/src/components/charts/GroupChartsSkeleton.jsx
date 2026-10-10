import React from 'react';

/**
 * Lightweight reserved-height loading skeleton for GroupChartsSection.
 * Kept in a separate file so GroupChartsSection can be code-split into its own lazy chunk.
 */
export function GroupChartsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-surface-raised/80 border border-border" />
        <div className="lg:col-span-1 h-72 rounded-2xl bg-surface-raised/80 border border-border" />
        <div className="md:col-span-2 lg:col-span-1 h-72 rounded-2xl bg-surface-raised/80 border border-border" />
        <div className="lg:col-span-1 h-72 rounded-2xl bg-surface-raised/80 border border-border" />
        <div className="lg:col-span-1 h-72 rounded-2xl bg-surface-raised/80 border border-border" />
      </div>
    </div>
  );
}

export default GroupChartsSkeleton;
