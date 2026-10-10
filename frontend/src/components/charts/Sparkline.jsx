import React from 'react';
import { m, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';
import { linearScale } from '../../utils/chartMath.js';

/**
 * Tiny Sparkline with end dot.
 * Purely decorative miniature chart for person cards and compact widgets.
 * Accessible with aria-hidden="true".
 *
 * @param {number[]} data Array of numbers (at most 20 points)
 * @param {number} [width=72]
 * @param {number} [height=24]
 * @param {string} [color] Optional override color (defaults to red if final > 0, else emerald)
 */
export function Sparkline({
  data = [],
  width = 72,
  height = 24,
  color = null,
}) {
  const prefersReducedMotion = useReducedMotion();

  if (!data || data.length < 2) {
    return (
      <div
        aria-hidden="true"
        style={{ width: `${width}px`, height: `${height}px` }}
        className="flex items-center justify-center opacity-30 select-none"
      >
        <span className="w-8 h-0.5 bg-text-muted rounded-full" />
      </div>
    );
  }

  const padding = 3;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);

  const xScale = linearScale([0, data.length - 1], [padding, padding + innerW]);
  const yScale = linearScale([min, max === min ? min + 1 : max], [padding + innerH, padding]);

  const pts = data.map((d, i) => ({
    x: xScale(i),
    y: yScale(d),
  }));

  const path = pts.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const lastPt = pts[pts.length - 1];
  const lastVal = data[data.length - 1];

  // If lastVal > 0 (still owes money), red/danger; if 0 or negative, emerald/success
  const strokeColor = color || (lastVal > 0 ? 'var(--chart-owes)' : 'var(--chart-owed)');

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      className="overflow-visible inline-block align-middle select-none"
    >
      <m.path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { pathLength: 0, opacity: 0 }
        }
        whileInView={
          prefersReducedMotion
            ? { opacity: 1, transition: { duration: 0.15 } }
            : {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.6, ease: easings.premium },
              }
        }
        viewport={{ once: true }}
      />
      {lastPt && (
        <m.circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="2.5"
          fill={strokeColor}
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          whileInView={{
            scale: 1,
            opacity: 1,
            transition: { delay: 0.45, duration: 0.25 },
          }}
          viewport={{ once: true }}
        />
      )}
    </svg>
  );
}

export default Sparkline;
