import React from 'react';
import { Loader2 } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { useHoverCapable } from '../../motion/useHoverCapable.js';
import { springs, durations } from '../../motion/tokens.js';

/**
 * Modern, accessible Button component with physics motion:
 * - Rising fill on primary variant
 * - Snappy tap compression (scale: 0.97)
 * - Layout-stable crossfade for loading spinner
 */
export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  className = '',
  onClick,
  ...props
}) {
  const isHoverCapable = useHoverCapable();

  const baseStyles =
    'relative inline-flex items-center justify-center font-bold tracking-tight rounded-xl overflow-hidden transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variants = {
    primary:
      'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20 hover:shadow-brand-500/30',
    secondary:
      'bg-surface-raised hover:bg-surface border border-border text-text hover:border-border/80 shadow-xs',
    outline:
      'bg-transparent hover:bg-surface-raised border border-border text-text hover:text-text',
    ghost:
      'bg-transparent hover:bg-surface-raised text-text-muted hover:text-text',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1 min-h-[30px] gap-1',
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[42px] gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 min-h-[48px] gap-2.5',
  };

  const isPrimary = variant === 'primary';

  const layerVariants = {
    idle: { y: '100%' },
    hover: { y: '0%', transition: springs.smooth },
  };

  return (
    <m.button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
      initial="idle"
      whileHover={isHoverCapable && isPrimary ? 'hover' : undefined}
      whileTap={{ scale: 0.97, transition: springs.snappy }}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Primary variant rising color highlight layer */}
      {isPrimary && (
        <m.div
          variants={layerVariants}
          className="absolute inset-0 bg-brand-400 pointer-events-none rounded-xl"
        />
      )}

      {/* Button Content with smooth crossfade on loading */}
      <div className="relative z-10 inline-flex items-center justify-center gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <m.div
              key="loader"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: durations.fast }}
              className="inline-flex items-center gap-1.5"
            >
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{children}</span>
            </m.div>
          ) : (
            <m.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.fast }}
              className="inline-flex items-center gap-1.5"
            >
              {iconLeft && <span className="shrink-0">{iconLeft}</span>}
              <span>{children}</span>
              {iconRight && <span className="shrink-0">{iconRight}</span>}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.button>
  );
}
