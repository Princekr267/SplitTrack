import React, { useEffect } from 'react';
import { m, useMotionValue, useTransform, animate, useReducedMotion } from 'motion/react';
import { easings } from '../../motion/tokens.js';

/**
 * Animated percentage counter using Motion.
 * Animates smoothly between values with tabular numerals.
 *
 * @param {number} value - Target percentage (0 - 100).
 * @param {number} [duration=0.9] - Duration in seconds.
 * @param {string} [className]
 */
export function AnimatedPercent({ value = 0, duration = 0.9, className = '' }) {
  const prefersReducedMotion = useReducedMotion();
  const numericVal = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  const count = useMotionValue(prefersReducedMotion ? numericVal : 0);
  const display = useTransform(count, (latest) => `${Math.round(latest)}%`);

  useEffect(() => {
    if (prefersReducedMotion) {
      count.set(numericVal);
      return;
    }
    const controls = animate(count, numericVal, {
      duration,
      ease: easings.premium,
    });
    return () => controls.stop();
  }, [numericVal, count, duration, prefersReducedMotion]);

  return (
    <m.span className={`font-mono tabular-nums ${className}`}>
      {display}
    </m.span>
  );
}

export default AnimatedPercent;
