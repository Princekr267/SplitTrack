# Production Component Templates Library (React + Tailwind + shadcn/ui)

A curated collection of production-ready, accessible, and composable UI primitives. Designed for React applications using Tailwind CSS and shadcn/ui principles.

---

## 0. Class Merging Utility (`cn`)

Always merge classes using `clsx` and `tailwind-merge` if installed in your project, or a lightweight combiner fallback. Do not re-create duplicate utilities if your project already exports `cn` from a `lib/utils` or `utils` directory.

```javascript
// Example: src/utils/cn.js (or src/lib/utils.js)
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Fallback if clsx/tailwind-merge are not installed:
// export function cn(...classes) {
//   return classes.filter(Boolean).join(' ');
// }
```

---

## 1. Bento Grid & Bento Card

Organizes cards into an asymmetric 12-column layout that gracefully stacks on mobile screens.

```jsx
import React from 'react';

/**
 * BentoGrid Container
 * 12-column base on desktop, 1-column on mobile.
 */
export function BentoGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * BentoCard Tile
 * Configurable col-span and row-span with hover elevation.
 */
export function BentoCard({
  title,
  subtitle,
  badge,
  children,
  colSpan = 'col-span-1 md:col-span-3 lg:col-span-4',
  rowSpan = '',
  highlight = false,
  className = '',
}) {
  return (
    <div
      className={`glass-panel p-5 sm:p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
        highlight
          ? 'border-brand-500/40 shadow-lg shadow-brand-500/10'
          : 'border-slate-800/80 hover:border-slate-700/80'
      } ${colSpan} ${rowSpan} ${className}`}
    >
      {(title || subtitle || badge) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {subtitle && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                {subtitle}
              </span>
            )}
            {title && (
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                {title}
              </h3>
            )}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      <div className="relative z-10 w-full flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
```

---

## 2. Stat / KPI Metric Card

Compact, scannable data tile designed for dashboards and Bento grids.

```jsx
import React from 'react';

export function StatCard({
  label,
  value,
  trend,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  caption,
  icon: Icon,
  className = '',
}) {
  const trendColors = {
    positive: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    negative: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
    neutral: 'text-slate-400 bg-slate-900 border-slate-800',
  };

  return (
    <div
      className={`glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${trendColors[trendType]}`}
          >
            {trend}
          </span>
        )}
      </div>

      {caption && (
        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
          {caption}
        </p>
      )}
    </div>
  );
}
```

---

## 3. Accessible Primary & Action Button

Supports variants, loading spinner, touch targets, and accessible focus rings.

```jsx
import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon: Icon,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px]',
    md: 'text-xs sm:text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-sm px-5 py-3 min-h-[48px]',
  };

  const variants = {
    primary:
      'bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-md shadow-brand-500/20 focus-visible:ring-brand-500',
    secondary:
      'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800 focus-visible:ring-slate-400',
    danger:
      'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20 focus-visible:ring-rose-500',
    ghost:
      'text-slate-400 hover:text-white hover:bg-slate-850 focus-visible:ring-slate-400',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
```

---

## 4. Responsive Modal / Mobile Bottom Sheet

Behaves as a centered modal on desktop and transforms into a natural bottom sheet on mobile screens. Includes accessible keyboard `Escape` listener and body scroll lock.

```jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'sm:max-w-md',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-4`}
      >
        {/* Mobile Swipe Grabber */}
        <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto sm:hidden mb-2" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div>
            <h2 id="modal-title" className="font-extrabold text-lg text-white tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
```

---

## 5. Shape-Accurate Skeleton Loaders

Prevents jarring Cumulative Layout Shifts (CLS) by matching the exact shape of incoming content.

```jsx
import React from 'react';

export function CardSkeleton() {
  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-slate-800 rounded-md" />
        <div className="h-5 w-16 bg-slate-800 rounded-full" />
      </div>
      <div className="h-8 w-44 bg-slate-800 rounded-lg" />
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <div className="h-2.5 w-full bg-slate-850 rounded" />
        <div className="h-2.5 w-3/4 bg-slate-850 rounded" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="animate-pulse border-b border-slate-800/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3 bg-slate-800 rounded-md w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}
```

---

## 6. Zero-Data Empty State

```jsx
import React from 'react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`glass-panel p-10 sm:p-12 rounded-2xl border border-dashed border-slate-800 text-center space-y-4 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-md">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionText && onAction && (
        <div className="pt-2">
          <Button onClick={onAction}>{actionText}</Button>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Contextual Inline Error State

```jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({
  title = 'Failed to load content',
  message,
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
    >
      <div className="flex items-start gap-3 text-rose-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
        <div>
          <strong className="font-bold text-white block">{title}</strong>
          {message && <p className="text-[11px] text-rose-300/90 mt-0.5">{message}</p>}
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
```

---

## 8. Accessible Form Field (Input with Label & Error)

```jsx
import React from 'react';

export function FormField({
  id,
  label,
  error,
  helperText,
  required = false,
  className = '',
  children,
}) {
  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p id={`${id}-error`} className="text-[11px] font-semibold text-rose-400 mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-[11px] text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ id, error, className = '', ...props }) {
  return (
    <input
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white placeholder-slate-500 text-xs sm:text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        error ? 'border-rose-500/80 focus-visible:ring-rose-500' : 'border-slate-800'
      } ${className}`}
      {...props}
    />
  );
}
```

---

## 9. Accessible Tab Switcher (Keyboard Navigable)

```jsx
import React from 'react';

export function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`border-b border-slate-800/80 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition relative whitespace-nowrap focus-visible:outline-none focus-visible:text-white ${
              isActive
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

---

## 10. Status Badge Component

```jsx
import React from 'react';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variants = {
    default: 'bg-slate-800/90 text-slate-300 border-slate-700/80',
    brand: 'bg-brand-950/60 text-brand-400 border-brand-500/30',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-950/60 text-rose-400 border-rose-500/30',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border tracking-wide uppercase ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
```
