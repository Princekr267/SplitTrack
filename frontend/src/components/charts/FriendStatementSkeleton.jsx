import React from 'react';

/**
 * Reserved-height loading skeleton for friend statement visualizations.
 * Prevents layout shift during lazy chunk loading on public share links and dashboard.
 */
export function FriendStatementSkeleton() {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl bg-surface-raised/80 border border-border" />
        <div className="h-64 rounded-2xl bg-surface-raised/80 border border-border" />
      </div>
    </div>
  );
}

export default FriendStatementSkeleton;
