import React from 'react';
import { m } from 'motion/react';
import { useHoverCapable } from '../../motion/useHoverCapable.js';
import { springs, durations } from '../../motion/tokens.js';

/**
 * Modern Bento / Feature Card adhering to design tokens.
 * Features:
 * - Physics lift on hover (desktop fine pointers)
 * - Rising tint layer (translateY: 100% -> 0)
 * - Tactile press on tap (scale: 0.98)
 * - Preserves border-radius geometry during layout animations
 */
export function Card({
  children,
  className = '',
  hover = false,
  tint = 'neutral', // 'neutral' | 'brand' | 'danger' | 'success' | 'warning'
  layout = false,
  layoutId,
  style = {},
  ...props
}) {
  const isHoverCapable = useHoverCapable();

  const tintStyles = {
    neutral: 'bg-surface-raised/70 dark:bg-surface-raised/40',
    brand: 'bg-brand-500/10 dark:bg-brand-500/15',
    danger: 'bg-rose-500/10 dark:bg-rose-500/15',
    success: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    warning: 'bg-amber-500/10 dark:bg-amber-500/15',
  };

  const cardVariants = {
    idle: {
      y: 0,
    },
    hover: {
      y: -3,
      transition: springs.smooth,
    },
  };

  const layerVariants = {
    idle: {
      y: '100%',
    },
    hover: {
      y: '0%',
      transition: springs.smooth,
    },
  };

  const shadowVariants = {
    idle: {
      opacity: 0,
    },
    hover: {
      opacity: 1,
      transition: { duration: durations.fast },
    },
  };

  if (!hover) {
    return (
      <div
        className={`bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs relative text-text ${className}`}
        style={{ borderRadius: 16, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <m.div
      layout={layout}
      layoutId={layoutId}
      initial="idle"
      whileHover={isHoverCapable ? 'hover' : undefined}
      whileTap={{ scale: 0.98, transition: springs.snappy }}
      variants={cardVariants}
      className={`
        bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden
        transition-colors duration-200 text-text select-none
        ${className}
      `}
      style={{ borderRadius: 16, ...style }}
      {...props}
    >
      {/* Rising color tint layer on hover */}
      <m.div
        variants={layerVariants}
        className={`absolute inset-0 pointer-events-none rounded-2xl ${tintStyles[tint] || tintStyles.neutral}`}
      />

      {/* Subtle elevation shadow overlay */}
      <m.div
        variants={shadowVariants}
        className="absolute inset-0 pointer-events-none rounded-2xl shadow-md border border-border/80"
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </m.div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={`text-base sm:text-lg font-bold text-text tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs sm:text-sm text-text-muted leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`pt-4 mt-4 border-t border-border flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
