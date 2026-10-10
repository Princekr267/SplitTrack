import React from 'react';
import { m, AnimatePresence } from 'motion/react';
import { formatINR } from '../../utils/currency.js';
import { springs } from '../../motion/tokens.js';

/**
 * Animated currency amount display.
 * Smoothly animates changes using Motion with tabular numbers.
 */
export default function AnimatedAmount({
  amount = 0,
  className = '',
  prefix = '',
  suffix = '',
  showSign = false,
}) {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
  let formatted = formatINR(Math.abs(numericAmount));

  if (showSign && numericAmount > 0) {
    formatted = `+${formatted}`;
  } else if (showSign && numericAmount < 0) {
    formatted = `-${formatted}`;
  }

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={formatted}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={springs.snappy}
          className="inline-block"
        >
          {formatted}
        </m.span>
      </AnimatePresence>
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}
