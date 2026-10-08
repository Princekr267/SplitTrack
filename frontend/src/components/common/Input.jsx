import React, { forwardRef } from 'react';

/**
 * Modern, accessible Form Input component with label, helper hint, error state, and icon slots.
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

      <div className="relative flex items-center">
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
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 mt-1">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-text-muted mt-1">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
