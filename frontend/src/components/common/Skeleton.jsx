import React from 'react';

/**
 * Pulsing skeleton loading components matching surface and border design tokens.
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-raised border border-border/50 ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-surface border border-border space-y-4 animate-pulse shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-1/3 h-5 bg-surface-raised rounded-lg" />
            <div className="w-16 h-5 bg-surface-raised rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3.5 bg-surface-raised rounded" />
            <div className="w-2/3 h-3.5 bg-surface-raised rounded" />
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="w-24 h-3 bg-surface-raised rounded" />
            <div className="w-16 h-3 bg-surface-raised rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonRow({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-raised" />
            <div className="space-y-1.5">
              <div className="w-28 h-3.5 bg-surface-raised rounded" />
              <div className="w-16 h-2.5 bg-surface-raised rounded" />
            </div>
          </div>
          <div className="w-20 h-4 bg-surface-raised rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat({ count = 3 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-surface border border-border space-y-2 animate-pulse"
        >
          <div className="w-20 h-3 bg-surface-raised rounded" />
          <div className="w-28 h-7 bg-surface-raised rounded" />
          <div className="w-24 h-2.5 bg-surface-raised rounded" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
