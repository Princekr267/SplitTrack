import React, { useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import { ChartHatchPattern } from './ChartHatchPattern.jsx';
import { AnimatedPercent } from './AnimatedPercent.jsx';
import { formatFullINR, buildRingSummary } from '../../utils/chartMath.js';

/**
 * Custom SVG Ring / Donut Chart with Motion.
 * Supports multiple segments, hatch pattern for pending amounts,
 * rounded caps, center slot with animated counter, and keyboard focus.
 *
 * @param {Array<{ key: string, label: string, value: number, color?: string, hatch?: boolean }>} segments
 * @param {number} total
 * @param {number} [size=220]
 * @param {number} [strokeWidth=22]
 * @param {React.ReactNode} [centerContent]
 * @param {string} [summary]
 */
export function RingChart({
  segments = [],
  total = 0,
  size = 220,
  strokeWidth = 22,
  centerContent = null,
  summary = '',
}) {
  const prefersReducedMotion = useReducedMotion();
  const [activeSegment, setActiveSegment] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const computedTotal = total > 0 ? total : segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);

  const accessibleSummary = summary || buildRingSummary(segments, computedTotal);

  // Filter valid non-zero segments
  const validSegments = segments.filter((s) => Number(s.value) > 0);
  const gap = validSegments.length > 1 ? 4 : 0;
  const totalGapLength = validSegments.length * gap;
  const availableCircumference = Math.max(0, circumference - totalGapLength);

  let currentOffset = 0;
  const segmentArcs = validSegments.map((seg, index) => {
    const fraction = computedTotal > 0 ? Math.max(0, Number(seg.value)) / computedTotal : 0;
    const arcLength = fraction * availableCircumference;
    const strokeDasharray = `${arcLength} ${circumference - arcLength}`;
    const offset = currentOffset;
    currentOffset += arcLength + gap;

    return {
      ...seg,
      index,
      fraction,
      arcLength,
      strokeDasharray,
      offset,
    };
  });

  const handlePointerEnter = (seg, e) => {
    setActiveSegment(seg);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % validSegments.length;
      setActiveSegment(segmentArcs[nextIdx]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + validSegments.length) % validSegments.length;
      setActiveSegment(segmentArcs[prevIdx]);
    } else if (e.key === 'Escape') {
      setActiveSegment(null);
    }
  };

  return (
    <div
      role="img"
      aria-label={accessibleSummary}
      className="relative flex items-center justify-center select-none"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 overflow-visible"
      >
        <ChartHatchPattern id="ring-hatch-pending" />

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--chart-track)"
          strokeWidth={strokeWidth}
          className="transition-colors duration-150"
        />

        {/* Dynamic Segments */}
        {segmentArcs.map((seg) => {
          const strokeColor = seg.hatch
            ? 'url(#ring-hatch-pending)'
            : seg.color || 'var(--chart-primary)';

          return (
            <m.circle
              key={seg.key || seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={activeSegment?.key === seg.key ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
              tabIndex={0}
              role="button"
              aria-label={`${seg.label}: ${formatFullINR(seg.value, true)}`}
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
                      transition: {
                        duration: 0.9,
                        delay: seg.index * 0.08,
                        ease: easings.premium,
                      },
                    }
              }
              viewport={{ once: true, margin: '-10%' }}
              onPointerEnter={(e) => handlePointerEnter(seg, e)}
              onPointerLeave={() => setActiveSegment(null)}
              onFocus={(e) => handlePointerEnter(seg, e)}
              onBlur={() => setActiveSegment(null)}
              onKeyDown={(e) => handleKeyDown(e, seg.index)}
              className="cursor-pointer transition-all duration-150 focus:outline-none focus:stroke-text"
            />
          );
        })}
      </svg>

      {/* Center Display Slot */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
        {centerContent ? (
          centerContent
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight font-mono">
              <AnimatedPercent
                value={
                  computedTotal > 0 && segmentArcs[0]
                    ? Math.round(segmentArcs[0].fraction * 100)
                    : 0
                }
              />
            </span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">
              {segments[0]?.label || 'Collected'}
            </span>
          </div>
        )}
      </div>

      {/* Segment Tooltip */}
      <ChartTooltip
        open={Boolean(activeSegment)}
        x={tooltipPos.x}
        y={tooltipPos.y}
        announcement={
          activeSegment
            ? `${activeSegment.label}: ${formatFullINR(activeSegment.value, true)} (${Math.round(
                activeSegment.fraction * 100
              )}%)`
            : ''
        }
      >
        {activeSegment && (
          <div className="space-y-1">
            <div className="font-semibold text-text flex items-center justify-between gap-3">
              <span>{activeSegment.label}</span>
              <span className="font-mono text-text-muted">
                {Math.round(activeSegment.fraction * 100)}%
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-text">
              {formatFullINR(activeSegment.value, true)}
            </div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}

export default RingChart;
