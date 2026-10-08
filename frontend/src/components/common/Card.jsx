import React from 'react';

/**
 * Bento / Modern Card components adhering to 60-30-10 surface tokens and soft borders.
 */
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200
        ${hover ? 'hover:border-border/80 hover:shadow-md hover:bg-surface-raised/40' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
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
