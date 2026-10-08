import React from 'react';
import Button from './Button.jsx';

/**
 * Modern Empty State display with icon badge, title, description, and optional action.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`p-8 sm:p-12 rounded-2xl bg-surface border border-dashed border-border text-center flex flex-col items-center justify-center space-y-3.5 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted shadow-inner mb-1">
          {icon}
        </div>
      )}

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-text tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onAction}
            iconLeft={actionIcon}
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
