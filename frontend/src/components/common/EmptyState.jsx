import React from 'react';
import { m } from 'motion/react';
import Button from './Button.jsx';
import { springs } from '../../motion/tokens.js';

/**
 * Modern Empty State display with icon badge, title, description, and optional action.
 * Features gentle spring entrance and floating icon badge.
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
    <m.div
      initial={{ opacity: 0, scale: 0.98, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springs.smooth}
      className={`p-8 sm:p-12 rounded-2xl bg-surface border border-dashed border-border text-center flex flex-col items-center justify-center space-y-3.5 ${className}`}
    >
      {icon && (
        <m.div
          initial={{ scale: 0.8, rotate: -4 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={springs.smooth}
          className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted shadow-inner mb-1"
        >
          {icon}
        </m.div>
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
    </m.div>
  );
}
