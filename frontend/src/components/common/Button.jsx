import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Modern, accessible Button component with multiple variants, sizes, and loading state.
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
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer';

  const variants = {
    primary:
      'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-md shadow-brand-500/20 hover:shadow-brand-500/30',
    secondary:
      'bg-surface-raised hover:bg-surface border border-border text-text hover:border-border/80 shadow-sm',
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

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {iconLeft && <span className="shrink-0">{iconLeft}</span>}
          <span>{children}</span>
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
