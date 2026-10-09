import React, { useEffect } from 'react';
import { m, useMotionValue, useTransform, animate } from 'motion/react';
import { fadeUp, fadeIn, scaleIn, staggerContainer, listItem } from './variants.js';
import { durations, easings } from './tokens.js';

/**
 * <Reveal>
 * Lightweight declarative reveal component wrapping an element in motion.
 */
export function Reveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  className = '',
  layout = false,
  ...props
}) {
  const variantMap = {
    fadeUp,
    fadeIn,
    scaleIn,
    listItem,
  };

  const selectedVariant = variantMap[variant] || fadeUp;

  return (
    <m.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={selectedVariant}
      transition={delay ? { delay } : undefined}
      layout={layout}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

/**
 * <Stagger>
 * Container for staggering children animations (e.g. list items, grids, pills).
 * Defaults to staggerChildren = 0.05s.
 */
export function Stagger({
  children,
  staggerChildren = 0.05,
  delayChildren = 0.02,
  className = '',
  ...props
}) {
  return (
    <m.div
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={{ staggerChildren, delayChildren }}
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

/**
 * <AnimatedNumber>
 * Smooth physics/tween counter that animates numeric value transitions.
 */
export function AnimatedNumber({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) {
  const numericVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return `${prefix}${latest.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(count, numericVal, {
      duration: durations.slow,
      ease: easings.premium,
    });
    return () => controls.stop();
  }, [numericVal, count]);

  return <m.span className={className}>{rounded}</m.span>;
}
