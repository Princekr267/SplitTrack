import React, { useState, useRef } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';
import { useChartSize } from './useChartSize.js';
import {
  linearScale,
  getNiceTicks,
  formatCompactINR,
  formatFullINR,
  buildAreaLineSummary,
} from '../../utils/chartMath.js';
import { ChartTooltip } from './ChartTooltip.jsx';

/**
 * Custom SVG Area & Line Chart with Motion.
 * Supports repayment pace (cumulative collected + target line) and
 * friend due trajectory over time (with hollow pending markers).
 * Includes crosshair scrubbing (pointer + touch with touch-action: pan-y)
 * and full keyboard navigation.
 *
 * @param {Array<{ date: string, value?: number, collected?: number, remaining?: number, label?: string }>} series
 * @param {number} [targetValue] Optional target baseline (e.g. totalOwed)
 * @param {Array<{ date: string, amount: number }>} [pendingMarkers] Hollow pending payment markers
 * @param {number} [height=220]
 * @param {string} [color='var(--chart-primary)']
 * @param {string} [targetColor='var(--chart-axis)']
 * @param {string} [summary]
 */
export function AreaLineChart({
  series = [],
  targetValue = null,
  pendingMarkers = [],
  height = 220,
  color = 'var(--chart-primary)',
  targetColor = 'var(--chart-axis)',
  summary = '',
}) {
  const containerRef = useRef(null);
  const { width } = useChartSize(containerRef, 360);
  const prefersReducedMotion = useReducedMotion();

  const [activeIndex, setActiveIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const accessibleSummary = summary || buildAreaLineSummary(series, targetValue);

  if (!series || series.length === 0) {
    return (
      <div className="w-full h-44 flex items-center justify-center text-xs text-text-muted">
        No timeline data available.
      </div>
    );
  }

  // Margins in real pixels
  const margin = { top: 16, right: 16, bottom: 28, left: 48 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  // Extract numeric values (series can have .collected, .remaining, or .value)
  const extractVal = (d) => {
    if (d.collected !== undefined) return Number(d.collected) || 0;
    if (d.remaining !== undefined) return Number(d.remaining) || 0;
    return Number(d.value) || 0;
  };

  const values = series.map(extractVal);
  let maxVal = Math.max(...values, targetValue || 0, 100);
  // Add 10% headroom
  maxVal = Math.ceil(maxVal * 1.08);
  const minVal = 0;

  // Scales
  const xScale = linearScale([0, Math.max(1, series.length - 1)], [margin.left, margin.left + innerWidth]);
  const yScale = linearScale([minVal, maxVal], [margin.top + innerHeight, margin.top]);

  // Y Ticks
  const yTicks = getNiceTicks(minVal, maxVal, 4);

  // X Ticks: thin out on small widths
  const maxXTicks = width < 450 ? 4 : 7;
  const xStep = Math.max(1, Math.ceil(series.length / maxXTicks));
  const xTickIndices = [];
  for (let i = 0; i < series.length; i += xStep) {
    xTickIndices.push(i);
  }
  if (!xTickIndices.includes(series.length - 1)) {
    xTickIndices.push(series.length - 1);
  }

  // Construct SVG Path
  const points = series.map((d, i) => ({
    x: xScale(i),
    y: yScale(extractVal(d)),
    val: extractVal(d),
    raw: d,
  }));

  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaBottomY = margin.top + innerHeight;
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPt.x} ${areaBottomY} L ${firstPt.x} ${areaBottomY} Z`;

  // Optional target line path (horizontal at yScale(targetValue))
  const targetY = targetValue !== null ? yScale(targetValue) : null;

  // Scrub interaction handler (both mouse and touch)
  const handlePointerScrub = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    if (clientX === undefined) return;

    const relX = clientX - rect.left - margin.left;
    const clampedRelX = Math.max(0, Math.min(innerWidth, relX));
    const fraction = clampedRelX / innerWidth;
    const index = Math.min(series.length - 1, Math.max(0, Math.round(fraction * (series.length - 1))));

    setActiveIndex(index);
    setTooltipPos({ x: clientX, y: clientY || rect.top + points[index].y });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((prev) => (prev === null ? 0 : Math.min(series.length - 1, prev + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((prev) => (prev === null ? series.length - 1 : Math.max(0, prev - 1)));
    } else if (e.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={accessibleSummary}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerScrub}
      onPointerLeave={() => setActiveIndex(null)}
      onTouchMove={handlePointerScrub}
      onTouchEnd={() => setActiveIndex(null)}
      style={{ height: `${height}px`, touchAction: 'pan-y' }}
      className="w-full relative select-none cursor-crosshair focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible block"
      >
        {/* Horizontal Grid lines and Y axis ticks */}
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="var(--chart-grid)"
                strokeWidth="1"
              />
              <text
                x={margin.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--chart-axis)] text-[10px] font-mono tabular-nums"
              >
                {formatCompactINR(tick, true)}
              </text>
            </g>
          );
        })}

        {/* X axis dates */}
        {xTickIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          const dateStr = pt.raw.date;
          // Format date string (e.g. '2026-10-10' -> '10 Oct')
          let formattedDate = dateStr;
          try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const d = new Date(parts[0], parts[1] - 1, parts[2]);
              formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }
          } catch {
            // fallback
          }

          return (
            <text
              key={idx}
              x={pt.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-[var(--chart-axis)] text-[10px] font-mono tabular-nums"
            >
              {formattedDate}
            </text>
          );
        })}

        {/* Target dashed line if specified */}
        {targetY !== null && (
          <m.g
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            whileInView={{ opacity: 1, transition: { duration: 0.5 } }}
            viewport={{ once: true, margin: '-10%' }}
          >
            <line
              x1={margin.left}
              y1={targetY}
              x2={margin.left + innerWidth}
              y2={targetY}
              stroke={targetColor}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={margin.left + innerWidth}
              y={targetY - 5}
              textAnchor="end"
              className="fill-[var(--chart-axis)] text-[9px] font-mono font-medium"
            >
              Target ({formatCompactINR(targetValue, true)})
            </text>
          </m.g>
        )}

        {/* Soft Area fill (solid color at low opacity, no gradient washes) */}
        <m.path
          d={areaPath}
          fill={color}
          fillOpacity={0.12}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          whileInView={{
            opacity: 1,
            transition: { duration: 0.5, delay: 0.4 },
          }}
          viewport={{ once: true, margin: '-10%' }}
        />

        {/* The Animated Trend Line */}
        <m.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { pathLength: 0, opacity: 0 }
          }
          whileInView={
            prefersReducedMotion
              ? { opacity: 1, transition: { duration: 0.2 } }
              : {
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 1.1, ease: easings.premium },
                }
          }
          viewport={{ once: true, margin: '-10%' }}
        />

        {/* Hollow pending markers if any */}
        {pendingMarkers.map((marker, mIdx) => {
          const matchedIdx = series.findIndex((s) => s.date === marker.date);
          const x = matchedIdx >= 0 ? xScale(matchedIdx) : margin.left + (mIdx * innerWidth) / 4;
          const y = margin.top + innerHeight * 0.4;
          return (
            <circle
              key={mIdx}
              cx={x}
              cy={y}
              r="4.5"
              fill="var(--surface)"
              stroke="var(--chart-pending)"
              strokeWidth="2"
              className="cursor-pointer"
            />
          );
        })}

        {/* End dot with soft single pulse ring */}
        {lastPt && (
          <m.g
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            whileInView={{
              scale: 1,
              opacity: 1,
              transition: { delay: 1.1, duration: 0.35, ease: easings.premium },
            }}
            viewport={{ once: true, margin: '-10%' }}
          >
            {/* Soft pulse ring (once) */}
            {!prefersReducedMotion && (
              <m.circle
                cx={lastPt.x}
                cy={lastPt.y}
                r="9"
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ delay: 1.25, duration: 0.7, ease: easings.easeOut }}
              />
            )}
            <circle cx={lastPt.x} cy={lastPt.y} r="4" fill={color} />
          </m.g>
        )}

        {/* Interactive Scrub Crosshair & Indicator */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={margin.top}
              x2={activePoint.x}
              y2={margin.top + innerHeight}
              stroke="var(--chart-axis)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Scrub Tooltip */}
      <ChartTooltip
        open={Boolean(activePoint)}
        x={tooltipPos.x}
        y={tooltipPos.y}
        announcement={
          activePoint
            ? `${activePoint.raw.date}: ${formatFullINR(activePoint.val, true)}`
            : ''
        }
      >
        {activePoint && (
          <div className="space-y-1">
            <div className="font-semibold text-text text-[11px]">
              {activePoint.raw.date}
            </div>
            {activePoint.raw.label && (
              <div className="text-[10px] text-text-muted">
                {activePoint.raw.label}
              </div>
            )}
            <div className="font-mono font-bold text-sm text-text">
              {formatFullINR(activePoint.val, true)}
            </div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}

export default AreaLineChart;
