import React, { forwardRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { durations, easings } from '../../motion/tokens.js';

/**
 * Modern, accessible Form Input component with label, helper hint, error state, and icon slots.
 * Features physics-based error shake and smooth error message height transitions.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    id,
    name,
    type = 'text',
    className = '',
    required = false,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      )}

      <m.div
        animate={error ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="relative flex items-center"
      >
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-xl bg-surface-raised border text-text placeholder-text-muted text-sm transition-all duration-150
            focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : 'px-3.5'}
            ${rightIcon ? 'pr-10' : 'px-3.5'}
            py-2.5 min-h-[42px]
            ${error ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500' : 'border-border'}
            ${className}
          `}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-text-muted">
            {rightIcon}
          </div>
        )}
      </m.div>

      <AnimatePresence mode="wait">
        {error ? (
          <m.p
            key="error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: durations.fast, ease: easings.easeOut }}
            className="text-[11px] font-medium text-rose-500 dark:text-rose-400 mt-1 overflow-hidden"
          >
            {error}
          </m.p>
        ) : hint ? (
          <m.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durations.fast }}
            className="text-[11px] text-text-muted mt-1"
          >
            {hint}
          </m.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

export default Input;
