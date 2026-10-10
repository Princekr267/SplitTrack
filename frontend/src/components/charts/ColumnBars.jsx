import React, { useState, useRef } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';
import { useChartSize } from './useChartSize.js';
import {
  linearScale,
  formatCompactINR,
  formatFullINR,
  buildColumnBarsSummary,
} from '../../utils/chartMath.js';
import { ChartTooltip } from './ChartTooltip.jsx';

/**
 * Vertical Column Bars Chart with Motion.
 * Tailored for pending dues aging buckets (0-3, 4-7, 8-14, 15+).
 * Highlights the oldest bucket with danger/warning accent when above zero.
 * Bars animate upward from baseline with staggered timing and value labels.
 *
 * @param {Array<{ key: string, amount: number, people?: number }>} buckets
 * @param {number} [height=200]
 * @param {string} [summary]
 */
export function ColumnBars({
  buckets = [],
  height = 200,
  summary = '',
}) {
  const containerRef = useRef(null);
  const { width } = useChartSize(containerRef, 320);
  const prefersReducedMotion = useReducedMotion();

  const [activeBucket, setActiveBucket] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const accessibleSummary = summary || buildColumnBarsSummary(buckets);

  if (!buckets || buckets.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-xs text-text-muted">
        No aging bucket data available.
      </div>
    );
  }

  const margin = { top: 28, right: 12, bottom: 28, left: 12 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  const maxAmount = Math.max(100, ...buckets.map((b) => Number(b.amount) || 0));
  const yScale = linearScale([0, maxAmount], [innerHeight, 0]);

  const barCount = buckets.length;
  const colWidth = Math.min(64, innerWidth / barCount - 12);
  const colGap = (innerWidth - barCount * colWidth) / Math.max(1, barCount - 1);

  const handleFocusBucket = (bucket, idx, e) => {
    setActiveBucket(bucket);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % buckets.length;
      const el = document.getElementById(`column-bar-${buckets[nextIdx].key}`);
      el?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + buckets.length) % buckets.length;
      const el = document.getElementById(`column-bar-${buckets[prevIdx].key}`);
      el?.focus();
    } else if (e.key === 'Escape') {
      setActiveBucket(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={accessibleSummary}
      style={{ height: `${height}px` }}
      className="w-full relative select-none"
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible block"
      >
        {/* Baseline rule */}
        <line
          x1={margin.left}
          y1={margin.top + innerHeight}
          x2={margin.left + innerWidth}
          y2={margin.top + innerHeight}
          stroke="var(--chart-grid)"
          strokeWidth="1.5"
        />

        {buckets.map((bucket, idx) => {
          const amt = Number(bucket.amount) || 0;
          const barHeight = Math.max(amt > 0 ? 4 : 0, innerHeight - yScale(amt));
          const x = margin.left + idx * (colWidth + colGap);
          const y = margin.top + innerHeight - barHeight;

          // Oldest bucket highlight: 15+ has danger accent when > 0
          const isOldest = bucket.key.includes('15') || idx === buckets.length - 1;
          const barColor =
            isOldest && amt > 0
              ? 'var(--chart-owes)'
              : amt > 0
              ? 'var(--chart-primary)'
              : 'var(--chart-track)';

          return (
            <g key={bucket.key}>
              {/* Invisible touch/focus target (min 44px wide) */}
              <rect
                id={`column-bar-${bucket.key}`}
                x={Math.max(0, x - (44 - colWidth) / 2)}
                y={margin.top}
                width={Math.max(44, colWidth)}
                height={innerHeight + margin.bottom}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${bucket.key} days: ${formatFullINR(amt, true)}`}
                onPointerEnter={(e) => handleFocusBucket(bucket, idx, e)}
                onPointerLeave={() => setActiveBucket(null)}
                onFocus={(e) => handleFocusBucket(bucket, idx, e)}
                onBlur={() => setActiveBucket(null)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="cursor-pointer focus:outline-none"
              />

              {/* Animated Column Bar */}
              <m.rect
                x={x}
                y={margin.top + innerHeight - barHeight}
                width={colWidth}
                height={barHeight}
                rx="5"
                ry="5"
                fill={barColor}
                style={{
                  transformOrigin: `${x + colWidth / 2}px ${margin.top + innerHeight}px`,
                }}
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { scaleY: 0, opacity: 0 }
                }
                whileInView={
                  prefersReducedMotion
                    ? { opacity: 1, transition: { duration: 0.15 } }
                    : {
                        scaleY: 1,
                        opacity: 1,
                        transition: {
                          duration: 0.6,
                          delay: idx * 0.08,
                          ease: easings.premium,
                        },
                      }
                }
                viewport={{ once: true, margin: '-10%' }}
                className="transition-colors pointer-events-none"
              />

              {/* Value Label on Top */}
              <m.text
                x={x + colWidth / 2}
                y={Math.max(margin.top - 8, y - 6)}
                textAnchor="middle"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.35 + idx * 0.08, duration: 0.3 },
                }}
                viewport={{ once: true, margin: '-10%' }}
                className={`text-[10px] font-mono font-semibold tabular-nums pointer-events-none ${
                  isOldest && amt > 0 ? 'fill-[var(--chart-owes)]' : 'fill-text'
                }`}
              >
                {formatCompactINR(amt, true)}
              </m.text>

              {/* Bucket Key Label on Bottom */}
              <text
                x={x + colWidth / 2}
                y={margin.top + innerHeight + 18}
                textAnchor="middle"
                className="fill-[var(--chart-axis)] text-[10px] font-mono font-medium pointer-events-none"
              >
                {bucket.key}d
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <ChartTooltip
        open={Boolean(activeBucket)}
        x={tooltipPos.x}
        y={tooltipPos.y}
        announcement={
          activeBucket
            ? `${activeBucket.key} days: ${formatFullINR(activeBucket.amount, true)}`
            : ''
        }
      >
        {activeBucket && (
          <div className="space-y-1">
            <div className="font-semibold text-text text-[11px]">
              {activeBucket.key} days pending
            </div>
            {activeBucket.people !== undefined && (
              <div className="text-[10px] text-text-muted">
                {activeBucket.people} {activeBucket.people === 1 ? 'person' : 'people'}
              </div>
            )}
            <div className="font-mono font-bold text-sm text-text">
              {formatFullINR(activeBucket.amount, true)}
            </div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}

export default ColumnBars;
