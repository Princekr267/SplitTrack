import React from 'react';
import { Clock, Check, X, Shield, Lock, AlertCircle } from 'lucide-react';

/**
 * Accessible Badge component with explicit semantic states and indicators.
 * Supported variants: 'pending' | 'accepted' | 'rejected' | 'settled' | 'active' | 'default' | 'brand' | 'danger' | 'warning' | 'info'
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  showIcon = false,
  className = '',
}) {
  const styles = {
    default:
      'bg-surface-raised text-text-muted border-border',
    brand:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    active:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accepted:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    settled:
      'bg-surface-raised text-text-muted border-border',
    pending:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    rejected:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    danger:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    info:
      'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 font-semibold gap-1.5',
  };

  const defaultIcon = () => {
    switch (variant) {
      case 'pending':
        return <Clock className="w-3 h-3 text-amber-500 shrink-0" />;
      case 'accepted':
        return <Check className="w-3 h-3 text-emerald-500 shrink-0" />;
      case 'rejected':
        return <X className="w-3 h-3 text-rose-500 shrink-0" />;
      case 'settled':
        return <Check className="w-3 h-3 text-text-muted shrink-0" />;
      case 'active':
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors ${
        styles[variant] || styles.default
      } ${sizes[size] || sizes.sm} ${className}`}
    >
      {showIcon && defaultIcon()}
      <span>{children}</span>
    </span>
  );
}
