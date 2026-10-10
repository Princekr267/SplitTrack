import React, { useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';
import { formatFullINR, buildStackedBarSummary } from '../../utils/chartMath.js';
import { ChartTooltip } from './ChartTooltip.jsx';

/**
 * Single Horizontal Stacked Bar with Legend.
 * Used for admin payment status breakdown (accepted, pending, rejected, voided).
 *
 * @param {Array<{ key: string, label: string, count: number, amount: number, color?: string }>} items
 * @param {number} [height=28]
 * @param {string} [summary]
 */
export function StackedBar({
  items = [],
  height = 28,
  summary = '',
}) {
  const prefersReducedMotion = useReducedMotion();
  const [activeItem, setActiveItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCount = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  const accessibleSummary = summary || buildStackedBarSummary(items);

  const validItems = items.filter((item) => Number(item.amount) > 0 || Number(item.count) > 0);

  const handlePointerEnter = (item, e) => {
    setActiveItem(item);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (idx + 1) % validItems.length;
      setActiveItem(validItems[nextIdx]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (idx - 1 + validItems.length) % validItems.length;
      setActiveItem(validItems[prevIdx]);
    } else if (e.key === 'Escape') {
      setActiveItem(null);
    }
  };

  return (
    <div
      role="img"
      aria-label={accessibleSummary}
      className="w-full space-y-4 select-none"
    >
      {/* Horizontal Stack Bar */}
      <div
        className="w-full rounded-xl overflow-hidden flex bg-surface-raised border border-border/50 p-0.5"
        style={{ height: `${height}px` }}
      >
        {validItems.map((item, idx) => {
          const fraction = totalAmount > 0 ? (Number(item.amount) || 0) / totalAmount : 1 / validItems.length;
          const widthPercent = Math.max(1, fraction * 100);
          const color = item.color || (idx === 0 ? 'var(--chart-owed)' : idx === 1 ? 'var(--chart-pending)' : 'var(--chart-owes)');

          return (
            <m.div
              key={item.key || item.label}
              tabIndex={0}
              role="button"
              aria-label={`${item.label}: ${item.count} payments, ${formatFullINR(item.amount, true)}`}
              onPointerEnter={(e) => handlePointerEnter(item, e)}
              onPointerLeave={() => setActiveItem(null)}
              onFocus={(e) => handlePointerEnter(item, e)}
              onBlur={() => setActiveItem(null)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              initial={
                prefersReducedMotion
                  ? { width: `${widthPercent}%`, opacity: 0 }
                  : { width: 0, opacity: 0 }
              }
              whileInView={
                prefersReducedMotion
                  ? { opacity: 1, transition: { duration: 0.15 } }
                  : {
                      width: `${widthPercent}%`,
                      opacity: 1,
                      transition: {
                        duration: 0.7,
                        delay: idx * 0.08,
                        ease: easings.premium,
                      },
                    }
              }
              viewport={{ once: true, margin: '-10%' }}
              style={{
                backgroundColor: color,
                minWidth: '4px',
              }}
              className="h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:z-10 relative transition-opacity hover:opacity-90"
            />
          );
        })}
      </div>

      {/* Legend with counts and amounts */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {items.map((item) => {
          const color = item.color || 'var(--chart-primary)';
          return (
            <div
              key={item.key || item.label}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-text capitalize">
                {item.label}:
              </span>
              <span className="font-mono text-text-muted tabular-nums">
                {item.count} ({formatFullINR(item.amount, true)})
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      <ChartTooltip
        open={Boolean(activeItem)}
        x={tooltipPos.x}
        y={tooltipPos.y}
        announcement={
          activeItem
            ? `${activeItem.label}: ${activeItem.count} payments (${formatFullINR(activeItem.amount, true)})`
            : ''
        }
      >
        {activeItem && (
          <div className="space-y-1">
            <div className="font-semibold text-text capitalize">
              {activeItem.label}
            </div>
            <div className="text-[11px] text-text-muted">
              {activeItem.count} {activeItem.count === 1 ? 'transaction' : 'transactions'}
            </div>
            <div className="font-mono font-bold text-sm text-text">
              {formatFullINR(activeItem.amount, true)}
            </div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}

export default StackedBar;
