import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import { springs } from '../../motion/tokens.js';

/**
 * Portal-based accessible Chart Tooltip.
 * Floats near the cursor / target point, clamps securely within viewport bounds,
 * supports touch tap-to-inspect, and announces content to screen readers via aria-live.
 *
 * @param {boolean} open - Whether the tooltip is currently visible.
 * @param {number} x - Target client X coordinate.
 * @param {number} y - Target client Y coordinate.
 * @param {React.ReactNode} children - Content to display inside tooltip.
 * @param {string} [announcement] - Accessible text to read aloud via aria-live polite.
 */
export function ChartTooltip({
  open = false,
  x = 0,
  y = 0,
  children,
  announcement = '',
}) {
  const prefersReducedMotion = useReducedMotion();
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ left: x, top: y });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Calculate clamped viewport positions
    const padding = 12;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 180;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 60;

    let targetLeft = x + 14;
    let targetTop = y - tooltipHeight / 2;

    // Viewport right edge boundary
    if (targetLeft + tooltipWidth > window.innerWidth - padding) {
      targetLeft = x - tooltipWidth - 14;
    }
    // Viewport left edge boundary
    if (targetLeft < padding) {
      targetLeft = padding;
    }

    // Viewport bottom edge boundary
    if (targetTop + tooltipHeight > window.innerHeight - padding) {
      targetTop = window.innerHeight - tooltipHeight - padding;
    }
    // Viewport top edge boundary
    if (targetTop < padding) {
      targetTop = padding;
    }

    setCoords({ left: targetLeft, top: targetTop });
  }, [open, x, y]);

  if (!mounted || typeof document === 'undefined') return null;

  return (
    <>
      {/* Screen reader live region */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {open && announcement ? announcement : ''}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <m.div
              ref={tooltipRef}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={springs.snappy}
              style={{
                position: 'fixed',
                left: `${coords.left}px`,
                top: `${coords.top}px`,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="bg-surface/95 dark:bg-surface-raised/95 border border-border backdrop-blur-md shadow-xl rounded-xl p-2.5 text-xs text-text min-w-[130px] max-w-[260px] select-none"
            >
              {children}
            </m.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default ChartTooltip;
